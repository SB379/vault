"""Backlog of improvement items with LLM-generated implementation specs."""
import datetime
import re
from pathlib import Path

from .config import Config
from .ideas import parse_ideas_section
from .vault import slugify

_FM_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
_SEQ_RE = re.compile(r"^(\d{3})-")

SPEC_PROMPT = """You are writing an implementation spec for a repo you can see in full below.

Item: {title}: {description}

Write two markdown sections:
`## Spec` — problem, approach, design decisions with rationale, edge cases, what NOT to do (YAGNI);
`## Build plan` — exact files to create/modify with paths, function signatures, TDD test list with concrete test cases, acceptance criteria, and verification commands.
Be specific enough that an engineer with zero context beyond this document and the repo can execute it.

<repo>
{context}
</repo>"""

ITEM_TEMPLATE = """---
title: "{title}"
status: proposed
source: {source}
created: {created}
---

{description}
"""


def _fm_field(fm: str, key: str) -> str:
    m = re.search(rf"^{key}:\s*(.+)$", fm, re.MULTILINE)
    return m.group(1).strip().strip('"') if m else ""


def list_items(cfg: Config) -> list[dict]:
    """Parse all backlog items, sorted by sequence number."""
    if not cfg.backlog_dir.exists():
        return []
    items = []
    for path in sorted(cfg.backlog_dir.glob("*.md")):
        seq_m = _SEQ_RE.match(path.name)
        fm_m = _FM_RE.match(path.read_text())
        if not seq_m or not fm_m:
            continue
        fm = fm_m.group(1)
        items.append({
            "path": path,
            "seq": int(seq_m.group(1)),
            "title": _fm_field(fm, "title"),
            "status": _fm_field(fm, "status"),
            "source": _fm_field(fm, "source"),
            "created": _fm_field(fm, "created"),
        })
    return items


def next_seq(cfg: Config) -> int:
    items = list_items(cfg)
    return max((i["seq"] for i in items), default=0) + 1


def add_item(cfg: Config, title: str, description: str, source: str = "manual") -> Path:
    """Create a new `proposed` backlog item file."""
    cfg.backlog_dir.mkdir(parents=True, exist_ok=True)
    seq = next_seq(cfg)
    path = cfg.backlog_dir / f"{seq:03d}-{slugify(title)}.md"
    path.write_text(ITEM_TEMPLATE.format(
        title=title.replace('"', "'"),
        source=source,
        created=datetime.date.today().isoformat(),
        description=description.strip(),
    ))
    return path


def import_from_ideas(cfg: Config) -> list[Path]:
    """Add every Ideas-note pipeline improvement whose title isn't already in the backlog."""
    existing = {i["title"].lower() for i in list_items(cfg)}
    created: list[Path] = []
    if not cfg.ideas_dir.exists():
        return created
    for note in sorted(cfg.ideas_dir.glob("*.md")):
        for idea in parse_ideas_section(note.read_text(), "Pipeline improvements"):
            if idea["title"].lower() in existing:
                continue
            desc = idea["description"]
            if idea["rationale"]:
                desc += f"\n\n*Why:* {idea['rationale']}"
            created.append(add_item(cfg, idea["title"], desc, source=f"ideas:{note.stem}"))
            existing.add(idea["title"].lower())
    return created


def _build_repo_context(cfg: Config) -> str:
    """Concatenate repo sources (README, pipeline modules, dashboard lib) with path headers."""
    parts: list[str] = []
    candidates: list[Path] = [cfg.vault_root / "README.md"]
    candidates += sorted((cfg.vault_root / "pipeline" / "arxiv_pipeline").glob("*.py"))
    candidates += sorted((cfg.vault_root / "dashboard" / "lib").glob("*.ts"))
    for path in candidates:
        if not path.is_file():
            continue
        rel = path.relative_to(cfg.vault_root)
        parts.append(f"===== {rel} =====\n{path.read_text()}")
    return "\n\n".join(parts)


def generate_spec(cfg: Config, item_path: Path, client, model: str) -> Path:
    """One Opus call: append `## Spec` + `## Build plan` to the item, mark it specced."""
    text = item_path.read_text()
    fm_m = _FM_RE.match(text)
    if not fm_m:
        raise ValueError(f"no frontmatter in {item_path}")
    title = _fm_field(fm_m.group(1), "title")
    description = text[fm_m.end():].strip()
    prompt = SPEC_PROMPT.format(
        title=title, description=description, context=_build_repo_context(cfg)
    )
    with client.messages.stream(
        model=model,
        max_tokens=16000,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        response = stream.get_final_message()
    spec_md = "\n".join(b.text for b in response.content if b.type == "text").strip()
    if "## Spec" not in spec_md or "## Build plan" not in spec_md:
        raise RuntimeError(f"spec response missing required sections for {item_path.name}")
    updated = re.sub(r"^status: .+$", "status: specced", text, count=1, flags=re.MULTILINE)
    item_path.write_text(updated.rstrip() + "\n\n" + spec_md + "\n")
    return item_path


def run_spec_generation(cfg: Config, client) -> list[Path]:
    """Spec every `proposed` item; failures are isolated per item."""
    specced: list[Path] = []
    for item in list_items(cfg):
        if item["status"] != "proposed":
            continue
        try:
            specced.append(generate_spec(cfg, item["path"], client, cfg.spec_model))
        except Exception as e:
            print(f"  FAIL spec '{item['title']}': {e}")
    return specced
