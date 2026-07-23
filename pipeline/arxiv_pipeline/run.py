import datetime
from dataclasses import dataclass, field

from .config import Config
from .fetch import fetch_recent
from . import gateway
from .gateway import CircuitBreaker, CircuitOpenError, with_retries
from .health import check_summary
from .fulltext import get_fulltext
from .ideas import run_ideas
from .score import score_papers
from .summarize import summarize_paper
from . import vault


@dataclass
class RunResult:
    ingested: list[str] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)
    ideas_path: str | None = None


def run_pipeline(cfg: Config, client, today: str) -> RunResult:
    result = RunResult()
    state = vault.load_state(cfg)
    profile = cfg.interest_profile_path.read_text()
    concepts = vault.load_concepts(cfg)

    since = (datetime.date.fromisoformat(today) - datetime.timedelta(days=2)).isoformat()
    papers = fetch_recent(cfg.categories, since=since)

    breaker = CircuitBreaker()
    papers = score_papers(papers, profile=profile, client=client,
                          model=cfg.scoring_model, breaker=breaker)
    # Already-ingested papers are intentionally filtered AFTER scoring (idempotency semantics).
    selected = sorted(
        [p for p in papers
         if p.arxiv_id not in state["ingested_ids"]
         and (p.score or 0) >= cfg.score_threshold],
        key=lambda p: p.score or 0, reverse=True,
    )[: cfg.max_papers_per_day]

    entries: list[tuple] = []
    proposed: set[str] = set()
    for idx, paper in enumerate(selected):
        try:
            breaker.check()
        except CircuitOpenError:
            result.failures.append(
                f"circuit open: aborting {len(selected) - idx} remaining papers")
            break
        try:
            fulltext = get_fulltext(paper.arxiv_id)
            summary = with_retries(
                lambda: summarize_paper(paper, fulltext=fulltext, known_concepts=concepts,
                                        client=client, model=cfg.summary_model),
                breaker=breaker,
            )
            problems = check_summary(summary, fulltext, concepts)
            if problems:
                raise RuntimeError(f"semantic check failed: {problems}")
            note_path = vault.write_paper_note(cfg, paper, summary)
            vault.ensure_concept_pages(cfg, [t for t in summary.key_topics if t in concepts])
            proposed.update(summary.new_concepts)
            entries.append((paper, note_path.stem))
            state["ingested_ids"].append(paper.arxiv_id)
            result.ingested.append(paper.arxiv_id)
        except Exception as e:  # per-paper isolation: one failure never kills the run
            result.failures.append(f"{paper.arxiv_id}: {e}")

    # Save state before writing the digest so a digest failure can't lose ingestion state.
    vault.save_state(cfg, state)
    digest_path = cfg.daily_dir / f"{today}.md"
    if entries or result.failures or proposed or not digest_path.exists():
        vault.write_daily_digest(cfg, date=today, entries=entries,
                                 failures=result.failures, proposed_concepts=sorted(proposed))

    # Weekly-flavored ideas note; a failure here never breaks ingestion.
    if result.ingested or not (cfg.ideas_dir / f"{today}.md").exists():
        try:
            ideas_path = run_ideas(cfg, client=client, today=today, breaker=breaker)
            if ideas_path is not None:
                result.ideas_path = str(ideas_path)
        except Exception as e:
            result.failures.append(f"ideas: {e}")
    return result
