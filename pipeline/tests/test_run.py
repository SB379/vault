from arxiv_pipeline.config import Config
from arxiv_pipeline.models import Paper
from arxiv_pipeline.summarize import Summary
from arxiv_pipeline import run as run_mod
from arxiv_pipeline import vault



LONG_TEXT = "paper content " * 200


def healthy_summary(**overrides):
    fields = dict(
        tldr="This paper shows a substantial improvement in agent evaluation methods.",
        key_topics=[], new_concepts=["New Thing"], highlights=["h"],
        method="They construct a benchmark of 500 tasks and run each agent " * 3,
        evals_results="On the benchmark the method beats baselines by a wide margin " * 2,
        practitioner_takeaways="p", open_questions="o")
    fields.update(overrides)
    return Summary(**fields)


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

    def fake_score(ps, profile, client, model, **kw):
        for i, p in enumerate(ps):
            p.score = [9, 7, 2][i]
            p.score_reason = "r"
        return ps
    monkeypatch.setattr(run_mod, "score_papers", fake_score)
    monkeypatch.setattr(run_mod, "get_fulltext", lambda aid, **kw: LONG_TEXT)
    monkeypatch.setattr(run_mod, "summarize_paper",
                        lambda p, fulltext, known_concepts, client, model: healthy_summary(
                            key_topics=["LLM-as-judge"]))
    monkeypatch.setattr(run_mod, "run_ideas", lambda *a, **k: None)

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
    monkeypatch.setattr(run_mod, "get_fulltext", lambda aid, **kw: LONG_TEXT)
    monkeypatch.setattr(run_mod, "summarize_paper", lambda p, **kw: healthy_summary())

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


def _setup_min_pipeline(tmp_path, monkeypatch):
    cfg = Config(vault_root=tmp_path, score_threshold=0)
    cfg.system_dir.mkdir(parents=True)
    cfg.interest_profile_path.write_text("x")
    papers = [Paper(arxiv_id="2607.00001", title="P", abstract="A", authors=["X"],
                    categories=["cs.CL"], published="2026-07-21", url="u")]
    monkeypatch.setattr(run_mod, "fetch_recent", lambda *a, **k: papers)
    monkeypatch.setattr(run_mod, "score_papers", lambda ps, **k: [setattr(p, "score", 9) or p for p in ps])
    monkeypatch.setattr(run_mod, "get_fulltext", lambda aid, **kw: LONG_TEXT)
    monkeypatch.setattr(run_mod, "summarize_paper", lambda p, **kw: healthy_summary())
    return cfg


def test_ideas_failure_does_not_break_ingestion(tmp_path, monkeypatch):
    cfg = _setup_min_pipeline(tmp_path, monkeypatch)

    def boom(cfg, client, today, **kw):
        raise RuntimeError("ideas exploded")
    monkeypatch.setattr(run_mod, "run_ideas", boom)

    result = run_mod.run_pipeline(cfg, client=None, today="2026-07-22")
    assert len(result.ingested) == 1
    assert any("ideas: ideas exploded" in f for f in result.failures)
    assert result.ideas_path is None
    # ideas runs before the digest, so its failure lands in the digest
    assert "ideas exploded" in (cfg.daily_dir / "2026-07-22.md").read_text()


def test_ideas_path_recorded_on_success(tmp_path, monkeypatch):
    cfg = _setup_min_pipeline(tmp_path, monkeypatch)
    ideas_file = cfg.ideas_dir / "2026-07-22.md"
    monkeypatch.setattr(run_mod, "run_ideas", lambda cfg, client, today, **kw: ideas_file)

    result = run_mod.run_pipeline(cfg, client=None, today="2026-07-22")
    assert result.ideas_path == str(ideas_file)


def test_ideas_skipped_when_nothing_ingested_and_note_exists(tmp_path, monkeypatch):
    cfg = _setup_min_pipeline(tmp_path, monkeypatch)
    # first run ingests; mark it already ingested via state and pre-create ideas note
    vault.save_state(cfg, {"ingested_ids": ["2607.00001"], "failed": []})
    cfg.ideas_dir.mkdir(parents=True)
    (cfg.ideas_dir / "2026-07-22.md").write_text("existing")

    called = []
    monkeypatch.setattr(run_mod, "run_ideas", lambda *a, **k: called.append(1))
    result = run_mod.run_pipeline(cfg, client=None, today="2026-07-22")
    assert result.ingested == []
    assert called == []


def test_semantic_check_failure_records_and_writes_no_note(tmp_path, monkeypatch):
    cfg = _setup_min_pipeline(tmp_path, monkeypatch)
    # unhealthy summary: tiny tldr, no highlights
    monkeypatch.setattr(run_mod, "summarize_paper",
                        lambda p, **kw: healthy_summary(tldr="t", highlights=[]))
    result = run_mod.run_pipeline(cfg, client=None, today="2026-07-22")
    assert result.ingested == []
    assert any("semantic check failed" in f for f in result.failures)
    assert not cfg.papers_dir.exists() or not list(cfg.papers_dir.rglob("*.md"))
    state = vault.load_state(cfg)
    assert state["ingested_ids"] == []


def test_circuit_open_aborts_remaining_papers(tmp_path, monkeypatch):
    import anthropic
    import httpx

    cfg = Config(vault_root=tmp_path, score_threshold=0, max_papers_per_day=5)
    cfg.system_dir.mkdir(parents=True)
    cfg.interest_profile_path.write_text("x")
    papers = [Paper(arxiv_id=f"2607.0000{i}", title=f"P{i}", abstract="A", authors=["X"],
                    categories=["cs.CL"], published="2026-07-21", url=f"u{i}")
              for i in range(1, 5)]
    monkeypatch.setattr(run_mod, "fetch_recent", lambda *a, **k: papers)
    monkeypatch.setattr(run_mod, "score_papers",
                        lambda ps, **k: [setattr(p, "score", 9) or p for p in ps])
    monkeypatch.setattr(run_mod, "get_fulltext", lambda aid, **kw: LONG_TEXT)

    def always_fail(*a, **kw):
        raise anthropic.RateLimitError(
            "rl", response=httpx.Response(429, request=httpx.Request("POST", "https://x")),
            body=None)
    monkeypatch.setattr(run_mod, "summarize_paper", always_fail)
    monkeypatch.setattr(run_mod, "run_ideas", lambda *a, **k: None)
    # no real sleeping
    from arxiv_pipeline import gateway
    real_with_retries = gateway.with_retries
    monkeypatch.setattr(run_mod, "with_retries",
                        lambda fn, **kw: real_with_retries(fn, sleep_fn=lambda s: None, **kw))

    result = run_mod.run_pipeline(cfg, client=None, today="2026-07-22")
    assert result.ingested == []
    # breaker threshold 3: one failure per exhausted paper — papers 1-3 fail,
    # then the circuit opens and paper 4 is aborted
    assert any("circuit open: aborting 1 remaining papers" in f for f in result.failures)
    assert sum("rl" in f and "circuit" not in f for f in result.failures) == 3


def test_fulltext_transient_failure_retried(tmp_path, monkeypatch):
    import requests

    cfg = _setup_min_pipeline(tmp_path, monkeypatch)
    calls = {"n": 0}

    def flaky_fulltext(aid, **kw):
        calls["n"] += 1
        if calls["n"] == 1:
            raise requests.exceptions.ConnectionError("arxiv hiccup")
        return LONG_TEXT
    monkeypatch.setattr(run_mod, "get_fulltext", flaky_fulltext)
    from arxiv_pipeline import gateway
    real_with_retries = gateway.with_retries
    monkeypatch.setattr(run_mod, "with_retries",
                        lambda fn, **kw: real_with_retries(fn, sleep_fn=lambda s: None, **kw))
    monkeypatch.setattr(run_mod, "run_ideas", lambda *a, **k: None)

    result = run_mod.run_pipeline(cfg, client=None, today="2026-07-22")
    assert result.ingested == ["2607.00001"]
    assert calls["n"] == 2
    assert result.failures == []
