import json
import re
from pathlib import Path

from .config import Config
from .models import Paper
from .summarize import Summary


def slugify(title: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", title.lower())
    return s.strip("-")


NOTE_TEMPLATE = """---
arxiv_id: "{arxiv_id}"
title: {title_yaml}
authors: [{authors}]
categories: [{categories}]
published: {published}
score: {score}
url: {url}
tags: [paper]
---

# {title}

## TL;DR
{tldr}

## Abstract
> {abstract}

## Key Topics
{topics}

## Highlights
{highlights}

## Method
{method}

## Evals & Results
{evals}

## So What (for practitioners)
{takeaways}

## Open Questions / Critiques
{open_questions}
"""


def _note_path(out_dir: Path, slug: str, arxiv_id: str) -> Path:
    if not slug:
        return out_dir / f"{arxiv_id}.md"
    path = out_dir / f"{slug}.md"
    if path.exists():
        for line in path.read_text().splitlines():
            if line.startswith("arxiv_id:"):
                if line.split(":", 1)[1].strip().strip('"') != arxiv_id:
                    return out_dir / f"{slug}-{arxiv_id}.md"
                break
    return path


def write_paper_note(cfg: Config, paper: Paper, summary: Summary) -> Path:
    year, month = paper.published[:4], paper.published[5:7]
    out_dir = cfg.papers_dir / year / month
    out_dir.mkdir(parents=True, exist_ok=True)
    path = _note_path(out_dir, slugify(paper.title), paper.arxiv_id)
    path.write_text(NOTE_TEMPLATE.format(
        arxiv_id=paper.arxiv_id,
        title=paper.title,
        title_yaml=json.dumps(paper.title),
        authors=", ".join(json.dumps(a) for a in paper.authors),
        categories=", ".join(paper.categories),
        published=paper.published,
        score=paper.score,
        url=paper.url,
        tldr=summary.tldr,
        abstract=paper.abstract,
        topics="\n".join(f"- [[{t}]]" for t in summary.key_topics),
        highlights="\n".join(f"- {h}" for h in summary.highlights),
        method=summary.method,
        evals=summary.evals_results,
        takeaways=summary.practitioner_takeaways,
        open_questions=summary.open_questions,
    ))
    return path


def ensure_concept_pages(cfg: Config, concepts: list[str]) -> None:
    cfg.concepts_dir.mkdir(parents=True, exist_ok=True)
    for c in concepts:
        safe = re.sub(r"[/\\\0]", "-", c).lstrip(".")
        if not safe:
            continue
        page = cfg.concepts_dir / f"{safe}.md"
        if not page.exists():
            page.write_text(f"# {c}\n\nPapers touching this concept appear as backlinks.\n")


def load_state(cfg: Config) -> dict:
    if cfg.state_path.exists():
        try:
            return json.loads(cfg.state_path.read_text())
        except json.JSONDecodeError:
            cfg.state_path.rename(cfg.state_path.with_name("state.json.corrupt"))
    return {"ingested_ids": [], "failed": []}


def save_state(cfg: Config, state: dict) -> None:
    cfg.system_dir.mkdir(parents=True, exist_ok=True)
    cfg.state_path.write_text(json.dumps(state, indent=2))


def load_concepts(cfg: Config) -> list[str]:
    if not cfg.concepts_vocab_path.exists():
        return []
    lines = cfg.concepts_vocab_path.read_text().splitlines()
    return [l[2:].strip() for l in lines if l.startswith("- ")]


def save_concepts(cfg: Config, concepts: list[str]) -> None:
    cfg.system_dir.mkdir(parents=True, exist_ok=True)
    body = "# Concept vocabulary\n\n" + "\n".join(f"- {c}" for c in sorted(set(concepts))) + "\n"
    cfg.concepts_vocab_path.write_text(body)


def write_daily_digest(cfg: Config, date: str, entries: list[tuple[Paper, str]],
                       failures: list[str], proposed_concepts: list[str]) -> Path:
    cfg.daily_dir.mkdir(parents=True, exist_ok=True)
    lines = [f"# Daily papers — {date}", "", "## Ingested"]
    for paper, slug in entries:
        lines.append(f"- [[{slug}]] — score {paper.score}: {paper.score_reason}")
    if proposed_concepts:
        lines += ["", "## Proposed new concepts (approve by adding to `_system/concepts.md`)"]
        lines += [f"- {c}" for c in proposed_concepts]
    if failures:
        lines += ["", "## Failures (will retry next run)"]
        lines += [f"- {f}" for f in failures]
    path = cfg.daily_dir / f"{date}.md"
    path.write_text("\n".join(lines) + "\n")
    return path
