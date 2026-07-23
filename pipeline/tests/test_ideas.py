import json
from types import SimpleNamespace

import pytest

from arxiv_pipeline.config import Config
from arxiv_pipeline import ideas as ideas_mod


NOTE = """---
arxiv_id: "{arxiv_id}"
title: "{title}"
authors: ["A"]
categories: [cs.CL]
published: {published}
score: {score}
url: https://arxiv.org/abs/{arxiv_id}
tags: [paper]
---

# {title}

## TL;DR
{tldr}

## Abstract
> abs

## Key Topics
- [[x]]

## Highlights
- {highlight}

## Method
m

## Evals & Results
e

## So What (for practitioners)
{sowhat}

## Open Questions / Critiques
o
"""


def write_note(cfg, slug, **kw):
    d = cfg.papers_dir / kw["published"][:4] / kw["published"][5:7]
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{slug}.md").write_text(NOTE.format(**kw))


def make_vault(tmp_path):
    cfg = Config(vault_root=tmp_path)
    write_note(cfg, "fresh-one", arxiv_id="2607.00001", title="Fresh One",
               published="2026-07-20", score=8, tldr="tldr one", highlight="h1", sowhat="sw1")
    write_note(cfg, "fresh-two", arxiv_id="2607.00002", title="Fresh Two",
               published="2026-07-18", score=7, tldr="tldr two", highlight="h2", sowhat="sw2")
    write_note(cfg, "old-one", arxiv_id="2606.00003", title="Old One",
               published="2026-06-01", score=9, tldr="old tldr", highlight="oh", sowhat="osw")
    # malformed: no frontmatter
    d = cfg.papers_dir / "2026" / "07"
    d.mkdir(parents=True, exist_ok=True)
    (d / "broken.md").write_text("just some text without frontmatter")
    return cfg


def test_collect_recent_notes(tmp_path):
    cfg = make_vault(tmp_path)
    notes = ideas_mod.collect_recent_notes(cfg, "2026-07-22")
    slugs = {n["slug"] for n in notes}
    assert slugs == {"fresh-one", "fresh-two"}
    by_slug = {n["slug"]: n for n in notes}
    n = by_slug["fresh-one"]
    assert n["title"] == "Fresh One"
    assert n["published"] == "2026-07-20"
    assert n["score"] == "8"
    assert "tldr one" in n["tldr"]
    assert "h1" in n["highlights"]
    assert "sw1" in n["so_what"]


def test_collect_recent_notes_empty_vault(tmp_path):
    cfg = Config(vault_root=tmp_path)
    assert ideas_mod.collect_recent_notes(cfg, "2026-07-22") == []


class FakeClient:
    def __init__(self, payload, stop_reason="end_turn"):
        self.payload = payload
        self.stop_reason = stop_reason
        self.calls = []
        self.messages = self

    def create(self, **kwargs):
        self.calls.append(kwargs)
        text_block = SimpleNamespace(type="text", text=json.dumps(self.payload))
        return SimpleNamespace(content=[text_block], stop_reason=self.stop_reason)


IDEAS_PAYLOAD = {
    "pipeline_improvements": [
        {"title": "Better parsing", "description": "d1", "rationale": "r1",
         "source_slugs": ["fresh-one"]},
    ],
    "build_ideas": [
        {"title": "Eval harness", "description": "d2", "rationale": "r2",
         "source_slugs": ["fresh-one", "fresh-two"]},
    ],
}


def _notes():
    return [
        {"slug": "fresh-one", "title": "Fresh One", "published": "2026-07-20",
         "score": "8", "tldr": "t1", "highlights": "h1", "so_what": "s1"},
        {"slug": "fresh-two", "title": "Fresh Two", "published": "2026-07-18",
         "score": "7", "tldr": "t2", "highlights": "h2", "so_what": "s2"},
    ]


def test_generate_ideas(tmp_path):
    client = FakeClient(IDEAS_PAYLOAD)
    result = ideas_mod.generate_ideas(_notes(), client=client, model="claude-opus-4-8")
    assert result == IDEAS_PAYLOAD
    call = client.calls[0]
    prompt = call["messages"][0]["content"]
    assert "Fresh One" in prompt and "Fresh Two" in prompt
    assert call["model"] == "claude-opus-4-8"
    assert call["max_tokens"] == 8192


def test_generate_ideas_bad_stop_reason():
    client = FakeClient(IDEAS_PAYLOAD, stop_reason="max_tokens")
    with pytest.raises(RuntimeError):
        ideas_mod.generate_ideas(_notes(), client=client, model="m")


def test_write_ideas_note(tmp_path):
    cfg = Config(vault_root=tmp_path)
    path = ideas_mod.write_ideas_note(cfg, "2026-07-22", IDEAS_PAYLOAD)
    assert path == cfg.ideas_dir / "2026-07-22.md"
    text = path.read_text()
    assert "# Ideas — 2026-07-22" in text
    assert "## Pipeline improvements" in text
    assert "## Build ideas" in text
    assert "### Better parsing" in text
    assert "### Eval harness" in text
    assert "*Why:* r1" in text
    assert "[[fresh-one]], [[fresh-two]]" in text


def test_run_ideas_end_to_end(tmp_path, monkeypatch):
    cfg = make_vault(tmp_path)
    monkeypatch.setattr(ideas_mod, "generate_ideas",
                        lambda notes, client, model: IDEAS_PAYLOAD)
    path = ideas_mod.run_ideas(cfg, client=None, today="2026-07-22")
    assert path is not None and path.exists()
    assert "Eval harness" in path.read_text()


def test_run_ideas_semantic_gate_blocks_write(tmp_path, monkeypatch):
    cfg = make_vault(tmp_path)
    monkeypatch.setattr(ideas_mod, "generate_ideas",
                        lambda notes, client, model: {"pipeline_improvements": [], "build_ideas": []})
    with pytest.raises(RuntimeError, match="semantic check failed"):
        ideas_mod.run_ideas(cfg, client=None, today="2026-07-22")
    assert not (cfg.ideas_dir / "2026-07-22.md").exists()


def test_run_ideas_retries_transient_failure(tmp_path, monkeypatch):
    import anthropic
    import httpx

    cfg = make_vault(tmp_path)
    calls = {"n": 0}

    def flaky(notes, client, model):
        calls["n"] += 1
        if calls["n"] == 1:
            raise anthropic.RateLimitError(
                "rl", response=httpx.Response(429, request=httpx.Request("POST", "https://x")),
                body=None)
        return IDEAS_PAYLOAD
    monkeypatch.setattr(ideas_mod, "generate_ideas", flaky)
    path = ideas_mod.run_ideas(cfg, client=None, today="2026-07-22",
                               sleep_fn=lambda s: None)
    assert path is not None and path.exists()
    assert calls["n"] == 2


def test_run_ideas_no_notes(tmp_path):
    cfg = Config(vault_root=tmp_path)
    assert ideas_mod.run_ideas(cfg, client=None, today="2026-07-22") is None


def test_cli_ideas_flag(tmp_path, monkeypatch, capsys):
    from arxiv_pipeline import cli as cli_mod

    monkeypatch.setattr(cli_mod.anthropic, "Anthropic", lambda: object())
    monkeypatch.setattr(cli_mod, "run_ideas",
                        lambda cfg, client, today: tmp_path / "Ideas" / f"{today}.md")
    monkeypatch.setattr("sys.argv",
                        ["arxiv-pipeline", "--vault", str(tmp_path), "--ideas", "--date", "2026-07-22"])
    cli_mod.main()
    out = capsys.readouterr().out
    assert "Ideas" in out and "2026-07-22.md" in out
