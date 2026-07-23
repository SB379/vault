import datetime
import json
import re
from pathlib import Path

from .config import Config

IDEA_ITEM_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "rationale": {"type": "string"},
        "source_slugs": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["title", "description", "rationale", "source_slugs"],
    "additionalProperties": False,
}

IDEAS_SCHEMA = {
    "type": "object",
    "properties": {
        "pipeline_improvements": {"type": "array", "items": IDEA_ITEM_SCHEMA},
        "build_ideas": {"type": "array", "items": IDEA_ITEM_SCHEMA},
    },
    "required": ["pipeline_improvements", "build_ideas"],
    "additionalProperties": False,
}

PROMPT = """You are advising the maintainer of a personal arXiv research pipeline. The pipeline works like this: every day it fetches new arXiv papers in AI/ML/SE categories, scores them with an LLM against the maintainer's interest profile, produces full-text Opus summaries of the best ones, writes them as Obsidian notes with concept wikilinks, and surfaces everything on a Next.js dashboard.

Below are digests of the papers ingested over the past week. Based on them, produce:

(a) 3-6 concrete improvements to THIS pipeline's ingestion, extraction, or robustness, inspired by techniques described in these papers ("pipeline_improvements").
(b) 3-6 ideas for what the reader — an AI engineer — could build next, grounded in trends that cut across the papers ("build_ideas").

Every idea must cite the slugs of the source notes that inspired it in "source_slugs" (use only slugs present below). Be specific and actionable; avoid generic advice.

<notes>
{notes}
</notes>"""

_FM_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)


def _frontmatter_field(fm: str, key: str) -> str | None:
    m = re.search(rf"^{key}:\s*(.+)$", fm, re.MULTILINE)
    if not m:
        return None
    return m.group(1).strip().strip('"')


def _section(body: str, heading: str) -> str:
    m = re.search(rf"^## {re.escape(heading)}\n(.*?)(?=^## |\Z)", body, re.DOTALL | re.MULTILINE)
    return m.group(1).strip() if m else ""


def collect_recent_notes(cfg: Config, today: str) -> list[dict]:
    if not cfg.papers_dir.exists():
        return []
    cutoff = datetime.date.fromisoformat(today) - datetime.timedelta(days=cfg.ideas_window_days)
    notes = []
    for path in sorted(cfg.papers_dir.rglob("*.md")):
        try:
            text = path.read_text()
            fm_match = _FM_RE.match(text)
            if not fm_match:
                continue
            fm = fm_match.group(1)
            published = _frontmatter_field(fm, "published")
            title = _frontmatter_field(fm, "title")
            if not published or not title:
                continue
            if datetime.date.fromisoformat(published[:10]) < cutoff:
                continue
            body = text[fm_match.end():]
            notes.append({
                "slug": path.stem,
                "title": title,
                "published": published,
                "score": _frontmatter_field(fm, "score") or "",
                "tldr": _section(body, "TL;DR"),
                "highlights": _section(body, "Highlights"),
                "so_what": _section(body, "So What (for practitioners)"),
            })
        except Exception:
            continue
    return notes


def _render_notes(notes: list[dict]) -> str:
    return "\n\n".join(
        f"[{n['slug']}] {n['title']} (published {n['published']}, score {n['score']})\n"
        f"TL;DR: {n['tldr']}\nHighlights:\n{n['highlights']}\nSo what:\n{n['so_what']}"
        for n in notes
    )


def generate_ideas(notes: list[dict], client, model: str) -> dict:
    response = client.messages.create(
        model=model,
        max_tokens=8192,
        output_config={"format": {"type": "json_schema", "schema": IDEAS_SCHEMA}},
        messages=[{"role": "user", "content": PROMPT.format(notes=_render_notes(notes))}],
    )
    text = next((b.text for b in response.content if b.type == "text"), None)
    if text is None or response.stop_reason not in ("end_turn", "stop_sequence"):
        raise RuntimeError(f"unusable ideas response (stop_reason={response.stop_reason})")
    return json.loads(text)


def _render_section(items: list[dict]) -> list[str]:
    lines: list[str] = []
    for item in items:
        sources = ", ".join(f"[[{s}]]" for s in item["source_slugs"])
        lines += [
            f"### {item['title']}",
            item["description"],
            "",
            f"*Why:* {item['rationale']}",
            f"*Sources:* {sources}",
            "",
        ]
    return lines


def write_ideas_note(cfg: Config, today: str, ideas: dict) -> Path:
    cfg.ideas_dir.mkdir(parents=True, exist_ok=True)
    lines = [f"# Ideas — {today}", "", "## Pipeline improvements", ""]
    lines += _render_section(ideas["pipeline_improvements"])
    lines += ["## Build ideas", ""]
    lines += _render_section(ideas["build_ideas"])
    path = cfg.ideas_dir / f"{today}.md"
    path.write_text("\n".join(lines).rstrip() + "\n")
    return path


def run_ideas(cfg: Config, client, today: str) -> Path | None:
    notes = collect_recent_notes(cfg, today)
    if not notes:
        return None
    ideas = generate_ideas(notes, client=client, model=cfg.ideas_model)
    return write_ideas_note(cfg, today, ideas)
