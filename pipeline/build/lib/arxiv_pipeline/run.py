import datetime
from dataclasses import dataclass, field

from .config import Config
from .fetch import fetch_recent
from .fulltext import get_fulltext
from .score import score_papers
from .summarize import summarize_paper
from . import vault


@dataclass
class RunResult:
    ingested: list[str] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)


def run_pipeline(cfg: Config, client, today: str) -> RunResult:
    result = RunResult()
    state = vault.load_state(cfg)
    profile = cfg.interest_profile_path.read_text()
    concepts = vault.load_concepts(cfg)

    since = (datetime.date.fromisoformat(today) - datetime.timedelta(days=2)).isoformat()
    papers = fetch_recent(cfg.categories, since=since)

    papers = score_papers(papers, profile=profile, client=client, model=cfg.scoring_model)
    # Already-ingested papers are intentionally filtered AFTER scoring (idempotency semantics).
    selected = sorted(
        [p for p in papers
         if p.arxiv_id not in state["ingested_ids"]
         and (p.score or 0) >= cfg.score_threshold],
        key=lambda p: p.score or 0, reverse=True,
    )[: cfg.max_papers_per_day]

    entries: list[tuple] = []
    proposed: set[str] = set()
    for paper in selected:
        try:
            fulltext = get_fulltext(paper.arxiv_id)
            summary = summarize_paper(paper, fulltext=fulltext, known_concepts=concepts,
                                      client=client, model=cfg.summary_model)
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
    return result
