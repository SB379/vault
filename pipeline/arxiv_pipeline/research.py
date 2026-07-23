"""Market research stage: agentic web research over build ideas."""
import datetime
import re
from pathlib import Path

from .config import Config
from .gateway import with_retries
from .health import check_research
from .vault import slugify

MAX_CONTINUATIONS = 5

PROMPT = """You are doing market research for an AI engineer considering building: {title}. {description} Rationale: {rationale}. Search the web for existing products, startups, open-source projects, and recent launches in this space. Then write a markdown report with EXACTLY these sections: `## Verdict` (one of: **GAP** / **CROWDED** / **UNCLEAR**, plus 2-3 sentences), `## Existing players` (bulleted, with names and one-line descriptions; note if none found), `## Differentiation angle` (what a new entrant could do differently), `## Evidence` (key sources/links found)."""

_IDEA_BLOCK_RE = re.compile(
    r"^### (?P<title>.+?)\n(?P<body>.*?)(?=^### |\Z)", re.DOTALL | re.MULTILINE
)


def parse_build_ideas(raw: str) -> list[dict]:
    """Parse an Ideas note's `## Build ideas` section into idea dicts."""
    m = re.search(r"^## Build ideas\n(.*?)(?=^## |\Z)", raw, re.DOTALL | re.MULTILINE)
    if not m:
        return []
    section = m.group(1)
    ideas = []
    for block in _IDEA_BLOCK_RE.finditer(section):
        body = block.group("body")
        why = re.search(r"^\*Why:\* (.+)$", body, re.MULTILINE)
        sources = re.search(r"^\*Sources:\* (.+)$", body, re.MULTILINE)
        description_lines = []
        for line in body.splitlines():
            if line.startswith("*Why:*") or line.startswith("*Sources:*"):
                break
            description_lines.append(line)
        ideas.append({
            "title": block.group("title").strip(),
            "description": "\n".join(description_lines).strip(),
            "rationale": why.group(1).strip() if why else "",
            "source_slugs": re.findall(r"\[\[([^\]]+)\]\]", sources.group(1)) if sources else [],
        })
    return ideas


def research_idea(idea: dict, client, model: str) -> str:
    """Run one agentic web-search call and return the markdown report."""
    user_msg = {
        "role": "user",
        "content": PROMPT.format(
            title=idea["title"],
            description=idea["description"],
            rationale=idea["rationale"],
        ),
    }
    tools = [{"type": "web_search_20260209", "name": "web_search", "max_uses": 8}]
    messages = [user_msg]

    # Streaming avoids the SDK's per-request HTTP timeout: a single web-search
    # turn can run many minutes server-side, which times out non-streaming calls.
    # with_retries adds jittered backoff for overload/5xx/connection errors.
    def _call(msgs):
        def _once():
            with client.messages.stream(
                model=model, max_tokens=8192, tools=tools, messages=msgs
            ) as stream:
                return stream.get_final_message()

        return with_retries(_once)

    response = _call(messages)
    continuations = 0
    while response.stop_reason == "pause_turn":
        continuations += 1
        if continuations > MAX_CONTINUATIONS:
            raise RuntimeError("research still paused after max continuations")
        print(f"    ...continuing (round {continuations})", flush=True)
        messages = [user_msg, {"role": "assistant", "content": response.content}]
        response = _call(messages)
    if response.stop_reason == "refusal":
        raise RuntimeError("research request refused")
    texts = [b.text for b in response.content if b.type == "text"]
    if not texts:
        raise RuntimeError(f"no text in research response (stop_reason={response.stop_reason})")
    return "\n".join(texts).strip()


def write_research_note(cfg: Config, date: str, idea: dict, report_md: str) -> Path:
    cfg.research_dir.mkdir(parents=True, exist_ok=True)
    slug = slugify(idea["title"])
    sources = ", ".join(idea["source_slugs"])
    lines = [
        "---",
        f'idea_title: "{idea["title"]}"',
        f"date: {date}",
        f"sources: [{sources}]",
        "---",
        "",
        f"# {idea['title']}",
        "",
        report_md,
    ]
    path = cfg.research_dir / f"{date}-{slug}.md"
    path.write_text("\n".join(lines).rstrip() + "\n")
    return path


def _latest_ideas_note(cfg: Config, today: str) -> Path | None:
    if not cfg.ideas_dir.exists():
        return None
    cutoff = datetime.date.fromisoformat(today)
    best = None
    for path in sorted(cfg.ideas_dir.glob("*.md")):
        try:
            d = datetime.date.fromisoformat(path.stem)
        except ValueError:
            continue
        if d <= cutoff:
            best = path
    return best


def run_research(cfg: Config, client, today: str) -> list[Path]:
    """Research each build idea in the latest Ideas note; idempotent per note date."""
    note = _latest_ideas_note(cfg, today)
    if note is None:
        return []
    date = note.stem
    ideas = parse_build_ideas(note.read_text())
    written: list[Path] = []
    for i, idea in enumerate(ideas, 1):
        out = cfg.research_dir / f"{date}-{slugify(idea['title'])}.md"
        if out.exists():
            print(f"  SKIP existing {out.name}", flush=True)
            continue
        print(f"  [{i}/{len(ideas)}] researching: {idea['title']}", flush=True)
        try:
            report = research_idea(idea, client=client, model=cfg.research_model)
            problems = check_research(report)
            if problems:
                raise RuntimeError(f"semantic check failed: {problems}")
        except Exception as e:
            print(f"  FAIL research '{idea['title']}': {e}", flush=True)
            continue
        written.append(write_research_note(cfg, date, idea, report))
        print(f"  WROTE {written[-1].name}", flush=True)
    return written
