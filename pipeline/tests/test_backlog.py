from contextlib import contextmanager
from types import SimpleNamespace

import pytest

from arxiv_pipeline import backlog
from arxiv_pipeline.config import Config
from arxiv_pipeline.ideas import parse_ideas_section


IDEAS_NOTE = """# Ideas — 2026-07-22

## Pipeline improvements

### Better parsing
some pipeline thing
across two lines

*Why:* r0
*Sources:* [[slug-zero]]

### Another improvement
do the other thing

*Why:* r1
*Sources:* [[slug-one]]

## Build ideas

### Not an improvement
skip me

*Why:* nope
*Sources:* [[x]]
"""


@pytest.fixture
def cfg(tmp_path):
    return Config(vault_root=tmp_path)


def test_parse_ideas_section():
    items = parse_ideas_section(IDEAS_NOTE, "Pipeline improvements")
    assert [i["title"] for i in items] == ["Better parsing", "Another improvement"]
    assert "across two lines" in items[0]["description"]
    assert "*Why:*" not in items[0]["description"]
    assert items[0]["rationale"] == "r0"
    assert items[0]["source_slugs"] == ["slug-zero"]
    assert parse_ideas_section("# nothing\n", "Pipeline improvements") == []


def test_add_list_next_seq_roundtrip(cfg):
    assert backlog.list_items(cfg) == []
    assert backlog.next_seq(cfg) == 1
    p1 = backlog.add_item(cfg, "First thing", "desc one", source="manual")
    p2 = backlog.add_item(cfg, "Second thing", "desc two", source="ideas:2026-07-22")
    assert p1.name == "001-first-thing.md"
    assert p2.name == "002-second-thing.md"
    items = backlog.list_items(cfg)
    assert [i["seq"] for i in items] == [1, 2]
    assert items[0]["title"] == "First thing"
    assert items[0]["status"] == "proposed"
    assert items[1]["source"] == "ideas:2026-07-22"
    assert items[0]["created"]  # ISO date present
    assert backlog.next_seq(cfg) == 3
    assert "desc one" in p1.read_text()


def test_import_from_ideas_dedupes(cfg):
    cfg.ideas_dir.mkdir(parents=True)
    (cfg.ideas_dir / "2026-07-22.md").write_text(IDEAS_NOTE)
    backlog.add_item(cfg, "better PARSING", "already here", source="manual")
    created = backlog.import_from_ideas(cfg)
    assert len(created) == 1  # only "Another improvement"
    text = created[0].read_text()
    assert 'title: "Another improvement"' in text
    assert "source: ideas:2026-07-22" in text
    assert "*Why:* r1" in text
    # build ideas are never imported
    titles = [i["title"].lower() for i in backlog.list_items(cfg)]
    assert "not an improvement" not in titles
    # re-running imports nothing
    assert backlog.import_from_ideas(cfg) == []


class FakeStreamClient:
    def __init__(self, text):
        self.text = text
        self.calls = []
        self.messages = self

    @contextmanager
    def stream(self, **kwargs):
        self.calls.append(kwargs)
        text = self.text

        class S:
            def get_final_message(self):
                block = SimpleNamespace(type="text", text=text)
                return SimpleNamespace(content=[block], stop_reason="end_turn")

        yield S()


SPEC_MD = "## Spec\nthe plan\n\n## Build plan\nthe steps"


def _repo_files(cfg):
    (cfg.vault_root / "README.md").write_text("# Repo readme sentinel")
    pkg = cfg.vault_root / "pipeline" / "arxiv_pipeline"
    pkg.mkdir(parents=True)
    (pkg / "run.py").write_text("PY_SENTINEL = 1")
    lib = cfg.vault_root / "dashboard" / "lib"
    lib.mkdir(parents=True)
    (lib / "vault.ts").write_text("const TS_SENTINEL = 1;")


def test_generate_spec(cfg):
    _repo_files(cfg)
    item = backlog.add_item(cfg, "Cool item", "make it cooler", source="manual")
    client = FakeStreamClient(SPEC_MD)
    out = backlog.generate_spec(cfg, item, client, model="claude-opus-4-8")
    assert out == item
    sent = client.calls[0]
    assert sent["model"] == "claude-opus-4-8"
    prompt = sent["messages"][0]["content"]
    assert "Cool item" in prompt and "make it cooler" in prompt
    assert "Repo readme sentinel" in prompt
    assert "PY_SENTINEL" in prompt
    assert "TS_SENTINEL" in prompt
    assert "===== README.md =====" in prompt
    text = item.read_text()
    assert "status: specced" in text
    assert "## Spec" in text and "## Build plan" in text


def test_generate_spec_rejects_malformed_response(cfg):
    _repo_files(cfg)
    item = backlog.add_item(cfg, "Bad", "d", source="manual")
    with pytest.raises(RuntimeError):
        backlog.generate_spec(cfg, item, FakeStreamClient("no sections"), model="m")
    assert "status: proposed" in item.read_text()


def test_run_spec_generation_isolates_failures(cfg, capsys):
    _repo_files(cfg)
    backlog.add_item(cfg, "Fails", "d", source="manual")
    good = backlog.add_item(cfg, "Works", "d", source="manual")
    done = backlog.add_item(cfg, "Already done", "d", source="manual")
    done.write_text(done.read_text().replace("status: proposed", "status: done"))

    class FlakyClient(FakeStreamClient):
        def __init__(self):
            super().__init__(SPEC_MD)
            self.n = 0

        @contextmanager
        def stream(self, **kwargs):
            self.n += 1
            if self.n == 1:
                raise RuntimeError("boom")
            with super().stream(**kwargs) as s:
                yield s

    specced = backlog.run_spec_generation(cfg, FlakyClient())
    assert specced == [good]
    assert "FAIL spec 'Fails'" in capsys.readouterr().out
    assert "status: specced" in good.read_text()
    assert "status: done" in done.read_text()  # untouched


def test_config_spec_model():
    cfg = Config(vault_root=__import__("pathlib").Path("/x"))
    assert cfg.spec_model == "claude-opus-4-8"
    assert cfg.backlog_dir.name == "Backlog"
