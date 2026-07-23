from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Config:
    vault_root: Path
    categories: list[str] = field(
        default_factory=lambda: ["cs.CL", "cs.LG", "cs.SE", "cs.AI", "cs.IT", "cs.DB"]
    )
    max_papers_per_day: int = 12
    score_threshold: int = 6
    scoring_model: str = "claude-haiku-4-5"
    summary_model: str = "claude-opus-4-8"
    ideas_model: str = "claude-opus-4-8"
    ideas_window_days: int = 7

    @property
    def ideas_dir(self) -> Path:
        return self.vault_root / "Ideas"

    @property
    def papers_dir(self) -> Path:
        return self.vault_root / "Papers"

    @property
    def daily_dir(self) -> Path:
        return self.vault_root / "Daily"

    @property
    def concepts_dir(self) -> Path:
        return self.vault_root / "Concepts"

    @property
    def system_dir(self) -> Path:
        return self.vault_root / "_system"

    @property
    def interest_profile_path(self) -> Path:
        return self.system_dir / "interest-profile.md"

    @property
    def concepts_vocab_path(self) -> Path:
        return self.system_dir / "concepts.md"

    @property
    def state_path(self) -> Path:
        return self.system_dir / "state.json"
