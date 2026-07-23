"""Semantic health checks: catch hollow-but-plausible LLM outputs before they are written."""
from .summarize import Summary


def check_summary(summary: Summary, fulltext: str, known_concepts: list[str]) -> list[str]:
    """Return problem strings; empty list means healthy."""
    problems: list[str] = []
    if len(summary.tldr) < 40:
        problems.append(f"tldr too short ({len(summary.tldr)} chars < 40)")
    if not summary.highlights:
        problems.append("highlights empty")
    if len(summary.method) + len(summary.evals_results) < 200:
        problems.append("method+evals_results too short (< 200 chars combined)")
    strays = [t for t in summary.key_topics if t not in known_concepts]
    if strays:
        problems.append(f"key_topics not in known concepts: {strays}")
    if not summary.key_topics and not summary.new_concepts:
        problems.append("zero key_topics and zero new_concepts")
    if len(fulltext) < 2000:
        problems.append(
            f"fulltext suspiciously short ({len(fulltext)} chars < 2000) — likely a stub page")
    return problems


def check_ideas(ideas: dict) -> list[str]:
    problems: list[str] = []
    if not ideas.get("pipeline_improvements") and not ideas.get("build_ideas"):
        problems.append("both idea lists empty")
    for section in ("pipeline_improvements", "build_ideas"):
        for i, idea in enumerate(ideas.get(section) or []):
            if not idea.get("title") or not idea.get("description"):
                problems.append(f"{section}[{i}] missing title/description")
    return problems
