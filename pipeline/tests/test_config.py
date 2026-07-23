from pathlib import Path
from arxiv_pipeline.config import Config


def test_default_config():
    cfg = Config(vault_root=Path("/tmp/vault"))
    assert cfg.categories == ["cs.CL", "cs.LG", "cs.SE", "cs.AI", "cs.IT", "cs.DB"]
    assert cfg.max_papers_per_day == 12
    assert cfg.score_threshold == 6
    assert cfg.scoring_model == "claude-haiku-4-5"
    assert cfg.summary_model == "claude-opus-4-8"
    assert cfg.papers_dir == Path("/tmp/vault/Papers")
    assert cfg.daily_dir == Path("/tmp/vault/Daily")
    assert cfg.concepts_dir == Path("/tmp/vault/Concepts")
    assert cfg.system_dir == Path("/tmp/vault/_system")
    assert cfg.interest_profile_path == Path("/tmp/vault/_system/interest-profile.md")
    assert cfg.concepts_vocab_path == Path("/tmp/vault/_system/concepts.md")
    assert cfg.state_path == Path("/tmp/vault/_system/state.json")
    assert cfg.ideas_model == "claude-opus-4-8"
    assert cfg.ideas_window_days == 7
    assert cfg.ideas_dir == Path("/tmp/vault/Ideas")
