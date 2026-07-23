from types import SimpleNamespace

import pytest

from arxiv_pipeline.config import Config
from arxiv_pipeline import research as research_mod


IDEAS_NOTE = """# Ideas — 2026-07-22

## Pipeline improvements

### Better parsing
some pipeline thing

*Why:* r0
*Sources:* [[slug-zero]]

## Build ideas

### Eval harness for agents
Build a harness that does things.
Across two lines.

*Why:* because papers say so
*Sources:* [[fresh-one]], [[fresh-two]]

### Local RAG assistant
A local assistant.

*Why:* frugal
*Sources:* [[ragal-note]]
"""


def test_parse_build_ideas():
    ideas = research_mod.parse_build_ideas(IDEAS_NOTE)
    assert len(ideas) == 2
    a, b = ideas
    assert a["title"] == "Eval harness for agents"
    assert "Build a harness" in a["description"]
    assert "Across two lines." in a["description"]
    assert "*Why:*" not in a["description"]
    assert a["rationale"] == "because papers say so"
    assert a["source_slugs"] == ["fresh-one", "fresh-two"]
    assert b["title"] == "Local RAG assistant"
    assert b["source_slugs"] == ["ragal-note"]


def test_parse_build_ideas_no_section():
    assert research_mod.parse_build_ideas("# Nothing here\n") == []


def _text(t):
    return SimpleNamespace(type="text", text=t)


def _search_result():
    return SimpleNamespace(type="web_search_tool_result", content=[SimpleNamespace(type="web_search_result")])


class FakeClient:
    """Returns queued responses in order via the streaming context-manager shape."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []
        self.messages = self

    def stream(self, **kwargs):
        self.calls.append(kwargs)
        response = self.responses.pop(0)

        class _Stream:
            def __enter__(self_inner):
                return self_inner

            def __exit__(self_inner, *exc):
                return False

            def get_final_message(self_inner):
                return response

        return _Stream()


IDEA = {"title": "Eval harness for agents", "description": "d", "rationale": "r",
        "source_slugs": ["fresh-one"]}


def test_research_idea_single_turn():
    resp = SimpleNamespace(
        stop_reason="end_turn",
        content=[_text("## Verdict\n**GAP** words"), _search_result(), _text("## Evidence\nlinks")],
    )
    client = FakeClient([resp])
    report = research_mod.research_idea(IDEA, client=client, model="claude-opus-4-8")
    assert report == "## Verdict\n**GAP** words\n## Evidence\nlinks"
    call = client.calls[0]
    assert call["model"] == "claude-opus-4-8"
    assert call["tools"] == [{"type": "web_search_20260209", "name": "web_search", "max_uses": 8}]
    assert "Eval harness for agents" in call["messages"][0]["content"]


def test_research_idea_pause_turn_continuation():
    paused_content = [_text("partial"), _search_result()]
    paused = SimpleNamespace(stop_reason="pause_turn", content=paused_content)
    final = SimpleNamespace(stop_reason="end_turn", content=[_text("done")])
    client = FakeClient([paused, final])
    report = research_mod.research_idea(IDEA, client=client, model="m")
    assert report == "done"
    assert len(client.calls) == 2
    second = client.calls[1]["messages"]
    assert len(second) == 2
    assert second[0]["role"] == "user"
    assert second[1] == {"role": "assistant", "content": paused_content}


def test_research_idea_no_text_raises():
    resp = SimpleNamespace(stop_reason="end_turn", content=[_search_result()])
    with pytest.raises(RuntimeError):
        research_mod.research_idea(IDEA, client=FakeClient([resp]), model="m")


def test_research_idea_refusal_raises():
    resp = SimpleNamespace(stop_reason="refusal", content=[])
    with pytest.raises(RuntimeError):
        research_mod.research_idea(IDEA, client=FakeClient([resp]), model="m")


def test_write_research_note(tmp_path):
    cfg = Config(vault_root=tmp_path)
    path = research_mod.write_research_note(cfg, "2026-07-22", IDEA, "## Verdict\n**GAP** ok")
    assert path == cfg.research_dir / "2026-07-22-eval-harness-for-agents.md"
    text = path.read_text()
    assert 'idea_title: "Eval harness for agents"' in text
    assert "date: 2026-07-22" in text
    assert "sources: [fresh-one]" in text
    assert "# Eval harness for agents" in text
    assert "## Verdict" in text


def _vault_with_note(tmp_path):
    cfg = Config(vault_root=tmp_path)
    cfg.ideas_dir.mkdir(parents=True)
    (cfg.ideas_dir / "2026-07-22.md").write_text(IDEAS_NOTE)
    return cfg


def test_run_research_writes_notes(tmp_path):
    cfg = _vault_with_note(tmp_path)
    resp = SimpleNamespace(stop_reason="end_turn", content=[_text("## Verdict\n**GAP**")])
    client = FakeClient([resp, resp])
    paths = research_mod.run_research(cfg, client=client, today="2026-07-23")
    assert len(paths) == 2
    assert all(p.exists() for p in paths)


def test_run_research_idempotent_skip(tmp_path, capsys):
    cfg = _vault_with_note(tmp_path)
    cfg.research_dir.mkdir(parents=True)
    existing = cfg.research_dir / "2026-07-22-eval-harness-for-agents.md"
    existing.write_text("already done")
    resp = SimpleNamespace(stop_reason="end_turn", content=[_text("report")])
    client = FakeClient([resp])
    paths = research_mod.run_research(cfg, client=client, today="2026-07-23")
    assert len(paths) == 1
    assert paths[0].name == "2026-07-22-local-rag-assistant.md"
    assert existing.read_text() == "already done"


def test_run_research_failure_isolation(tmp_path, capsys):
    cfg = _vault_with_note(tmp_path)

    class FlakyClient:
        def __init__(self):
            self.messages = self
            self.n = 0

        def create(self, **kwargs):
            self.n += 1
            if self.n == 1:
                raise RuntimeError("boom")
            return SimpleNamespace(stop_reason="end_turn", content=[_text("ok")])

    paths = research_mod.run_research(cfg, client=FlakyClient(), today="2026-07-23")
    assert len(paths) == 1
    assert "FAIL research" in capsys.readouterr().out


def test_run_research_no_ideas_note(tmp_path):
    cfg = Config(vault_root=tmp_path)
    assert research_mod.run_research(cfg, client=None, today="2026-07-23") == []


def test_cli_research_flag(tmp_path, monkeypatch, capsys):
    from arxiv_pipeline import cli as cli_mod

    monkeypatch.setattr(cli_mod.anthropic, "Anthropic", lambda: object())
    monkeypatch.setattr(cli_mod, "run_research",
                        lambda cfg, client, today: [tmp_path / "Research" / "x.md"])
    monkeypatch.setattr("sys.argv",
                        ["arxiv-pipeline", "--vault", str(tmp_path), "--research"])
    cli_mod.main()
    assert "x.md" in capsys.readouterr().out
