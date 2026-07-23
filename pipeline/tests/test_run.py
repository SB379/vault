from arxiv_pipeline.config import Config
from arxiv_pipeline.models import Paper
from arxiv_pipeline.summarize import Summary
from arxiv_pipeline import run as run_mod
from arxiv_pipeline import vault


def test_run_pipeline_end_to_end(tmp_path, monkeypatch):
    cfg = Config(vault_root=tmp_path, max_papers_per_day=2, score_threshold=6)
    cfg.system_dir.mkdir(parents=True)
    cfg.interest_profile_path.write_text("evals and agents")
    vault.save_concepts(cfg, ["LLM-as-judge"])

    papers = [
        Paper(arxiv_id=f"2607.0000{i}", title=f"Paper {i}", abstract="A", authors=["X"],
              categories=["cs.CL"], published="2026-07-21", url=f"u{i}")
        for i in range(1, 4)
    ]
    monkeypatch.setattr(run_mod, "fetch_recent", lambda cats, since, fetch_fn=None: papers)

    def fake_score(ps, profile, client, model):
        for i, p in enumerate(ps):
            p.score = [9, 7, 2][i]
            p.score_reason = "r"
        return ps
    monkeypatch.setattr(run_mod, "score_papers", fake_score)
    monkeypatch.setattr(run_mod, "get_fulltext", lambda aid, **kw: "text")
    monkeypatch.setattr(run_mod, "summarize_paper", lambda p, fulltext, known_concepts, client, model: Summary(
        tldr="t", key_topics=["LLM-as-judge"], new_concepts=["New Thing"], highlights=["h"],
        method="m", evals_results="e", practitioner_takeaways="p", open_questions="o"))

    result = run_mod.run_pipeline(cfg, client=None, today="2026-07-22")

    assert len(result.ingested) == 2          # score 2 filtered out
    assert (cfg.daily_dir / "2026-07-22.md").exists()
    assert (cfg.concepts_dir / "LLM-as-judge.md").exists()
    assert not (cfg.concepts_dir / "New Thing.md").exists()  # proposed, not auto-created
    assert "New Thing" in (cfg.daily_dir / "2026-07-22.md").read_text()
    state = vault.load_state(cfg)
    assert set(state["ingested_ids"]) == {"2607.00001", "2607.00002"}

    # idempotency: second run ingests nothing new and leaves the digest intact
    result2 = run_mod.run_pipeline(cfg, client=None, today="2026-07-22")
    assert result2.ingested == []
    digest = (cfg.daily_dir / "2026-07-22.md").read_text()
    assert "[[paper-1]]" in digest and "[[paper-2]]" in digest


def test_digest_links_match_actual_note_filenames(tmp_path, monkeypatch):
    cfg = Config(vault_root=tmp_path, max_papers_per_day=5, score_threshold=0)
    cfg.system_dir.mkdir(parents=True)
    cfg.interest_profile_path.write_text("x")

    papers = [
        Paper(arxiv_id=f"2607.0000{i}", title="Same Title", abstract="A", authors=["X"],
              categories=["cs.CL"], published="2026-07-21", url=f"u{i}")
        for i in range(1, 3)
    ]
    monkeypatch.setattr(run_mod, "fetch_recent", lambda *a, **k: papers)
    monkeypatch.setattr(run_mod, "score_papers",
                        lambda ps, **k: [setattr(p, "score", 9) or p for p in ps])
    monkeypatch.setattr(run_mod, "get_fulltext", lambda aid, **kw: "text")
    monkeypatch.setattr(run_mod, "summarize_paper", lambda p, **kw: Summary(
        tldr="t", key_topics=[], new_concepts=[], highlights=["h"],
        method="m", evals_results="e", practitioner_takeaways="p", open_questions="o"))

    result = run_mod.run_pipeline(cfg, client=None, today="2026-07-22")
    assert len(result.ingested) == 2

    notes = sorted(p for p in cfg.papers_dir.rglob("*.md"))
    assert len(notes) == 2
    stems = {p.stem for p in notes}
    assert len(stems) == 2  # collision handling produced distinct filenames
    digest = (cfg.daily_dir / "2026-07-22.md").read_text()
    for stem in stems:
        assert stem in digest


def test_per_paper_failure_recorded(tmp_path, monkeypatch):
    cfg = Config(vault_root=tmp_path, score_threshold=0)
    cfg.system_dir.mkdir(parents=True)
    cfg.interest_profile_path.write_text("x")
    papers = [Paper(arxiv_id="2607.00009", title="Bad", abstract="A", authors=["X"],
                    categories=["cs.CL"], published="2026-07-21", url="u")]
    monkeypatch.setattr(run_mod, "fetch_recent", lambda *a, **k: papers)
    monkeypatch.setattr(run_mod, "score_papers", lambda ps, **k: [setattr(p, "score", 9) or p for p in ps])

    def boom(aid, **kw):
        raise RuntimeError("download failed")
    monkeypatch.setattr(run_mod, "get_fulltext", boom)

    result = run_mod.run_pipeline(cfg, client=None, today="2026-07-22")
    assert result.ingested == []
    assert "2607.00009" in result.failures[0]
    assert "download failed" in (cfg.daily_dir / "2026-07-22.md").read_text()
