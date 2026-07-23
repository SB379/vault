import json
from pathlib import Path

from arxiv_pipeline.config import Config
from arxiv_pipeline.models import Paper
from arxiv_pipeline.summarize import Summary
from arxiv_pipeline import vault


def make_cfg(tmp_path) -> Config:
    return Config(vault_root=tmp_path)


def make_paper():
    return Paper(arxiv_id="2607.00001", title="Evaluating LLM Agents: A Study",
                 abstract="We study agents.", authors=["Ada Lovelace"],
                 categories=["cs.CL"], published="2026-07-21",
                 url="https://arxiv.org/abs/2607.00001", score=8, score_reason="core")


def make_summary():
    return Summary(tldr="Big result.", key_topics=["LLM-as-judge"], new_concepts=["Rubric Drift"],
                   highlights=["h1", "h2"], method="M", evals_results="E",
                   practitioner_takeaways="P", open_questions="O")


def test_slugify():
    assert vault.slugify("Evaluating LLM Agents: A Study!") == "evaluating-llm-agents-a-study"


def test_write_paper_note(tmp_path):
    cfg = make_cfg(tmp_path)
    path = vault.write_paper_note(cfg, make_paper(), make_summary())
    assert path == cfg.papers_dir / "2026" / "07" / "evaluating-llm-agents-a-study.md"
    text = path.read_text()
    assert "arxiv_id: \"2607.00001\"" in text
    assert "[[LLM-as-judge]]" in text
    assert "## Abstract" in text and "We study agents." in text
    assert "## Evals & Results" in text
    assert "score: 8" in text


def test_ensure_concept_pages(tmp_path):
    cfg = make_cfg(tmp_path)
    vault.ensure_concept_pages(cfg, ["LLM-as-judge"])
    page = cfg.concepts_dir / "LLM-as-judge.md"
    assert page.exists()
    before = page.read_text()
    vault.ensure_concept_pages(cfg, ["LLM-as-judge"])  # idempotent
    assert page.read_text() == before


def test_state_roundtrip(tmp_path):
    cfg = make_cfg(tmp_path)
    assert vault.load_state(cfg) == {"ingested_ids": [], "failed": []}
    vault.save_state(cfg, {"ingested_ids": ["2607.00001"], "failed": []})
    assert vault.load_state(cfg)["ingested_ids"] == ["2607.00001"]


def test_concept_vocab_roundtrip(tmp_path):
    cfg = make_cfg(tmp_path)
    assert vault.load_concepts(cfg) == []
    vault.save_concepts(cfg, ["Agent Evaluation", "LLM-as-judge"])
    assert vault.load_concepts(cfg) == ["Agent Evaluation", "LLM-as-judge"]


def test_write_daily_digest(tmp_path):
    cfg = make_cfg(tmp_path)
    p = make_paper()
    path = vault.write_daily_digest(
        cfg, date="2026-07-22",
        entries=[(p, "evaluating-llm-agents-a-study")],
        failures=["2607.99999: download failed"],
        proposed_concepts=["Rubric Drift"],
    )
    text = path.read_text()
    assert path == cfg.daily_dir / "2026-07-22.md"
    assert "[[evaluating-llm-agents-a-study]]" in text
    assert "score 8" in text
    assert "Rubric Drift" in text
    assert "2607.99999" in text


def test_ensure_concept_pages_sanitizes_filenames(tmp_path):
    cfg = make_cfg(tmp_path)
    vault.ensure_concept_pages(cfg, ["I/O Scheduling"])
    assert (cfg.concepts_dir / "I-O Scheduling.md").exists()
    files = [p for p in tmp_path.rglob("*") if p.is_file()]
    assert all(cfg.concepts_dir in p.parents for p in files)


def test_frontmatter_escapes_quotes(tmp_path):
    cfg = make_cfg(tmp_path)
    p = make_paper()
    p.title = 'He said "hi"'
    p.authors = ['Ada "The Countess" Lovelace']
    path = vault.write_paper_note(cfg, p, make_summary())
    text = path.read_text()
    assert 'title: "He said \\"hi\\""' in text
    assert '"Ada \\"The Countess\\" Lovelace"' in text
    assert '# He said "hi"' in text


def test_slug_collision_appends_arxiv_id(tmp_path):
    cfg = make_cfg(tmp_path)
    p1 = make_paper()
    path1 = vault.write_paper_note(cfg, p1, make_summary())
    p2 = make_paper()
    p2.arxiv_id = "2607.00002"
    path2 = vault.write_paper_note(cfg, p2, make_summary())
    assert path2 != path1
    assert path2.name == "evaluating-llm-agents-a-study-2607.00002.md"
    # rerun of same paper overwrites its own file
    assert vault.write_paper_note(cfg, p1, make_summary()) == path1


def test_empty_slug_uses_arxiv_id(tmp_path):
    cfg = make_cfg(tmp_path)
    p = make_paper()
    p.title = "!!!"
    path = vault.write_paper_note(cfg, p, make_summary())
    assert path.name == "2607.00001.md"


def test_load_state_corrupt_json(tmp_path):
    cfg = make_cfg(tmp_path)
    cfg.system_dir.mkdir(parents=True, exist_ok=True)
    cfg.state_path.write_text("{not json")
    assert vault.load_state(cfg) == {"ingested_ids": [], "failed": []}
    corrupt = cfg.state_path.with_name("state.json.corrupt")
    assert corrupt.exists()
    assert corrupt.read_text() == "{not json"
