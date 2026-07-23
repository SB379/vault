import argparse
import datetime
import subprocess
import sys
from pathlib import Path

import anthropic

from .backlog import add_item, import_from_ideas, run_spec_generation
from .config import Config
from .ideas import run_ideas
from .research import run_research
from .run import run_pipeline


def _auto_commit(vault_root: Path) -> None:
    """Commit and push generated vault content; never fail the run over git."""
    try:
        subprocess.run(
            ["git", "add", "Papers", "Daily", "Concepts", "Ideas",
             "_system/state.json", "_system/concepts.md"],
            cwd=vault_root, check=True, capture_output=True,
        )
        staged = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=vault_root)
        if staged.returncode != 0:
            subprocess.run(["git", "commit", "-m", "chore: daily ingest"],
                           cwd=vault_root, check=True, capture_output=True)
            subprocess.run(["git", "push"], cwd=vault_root, check=True,
                           capture_output=True, timeout=60)
    except Exception as e:
        print(f"  WARN auto-commit skipped: {e}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Daily arXiv -> Obsidian pipeline")
    parser.add_argument("--vault", default=str(Path.cwd()),
                        help="Vault root (defaults to current directory)")
    parser.add_argument("--date", default=datetime.date.today().isoformat())
    parser.add_argument("--ideas", action="store_true",
                        help="Skip ingestion; only (re)generate the ideas note")
    parser.add_argument("--research", action="store_true",
                        help="Skip ingestion; run market research over the latest ideas note")
    parser.add_argument("--backlog-import", action="store_true",
                        help="Skip ingestion; import pipeline improvements from Ideas notes into Backlog/")
    parser.add_argument("--backlog-spec", action="store_true",
                        help="Skip ingestion; generate SPEC + BUILD docs for proposed backlog items")
    parser.add_argument("--backlog-add", metavar="TITLE",
                        help="Skip ingestion; add a manual backlog item")
    parser.add_argument("--desc", default="",
                        help="Description for --backlog-add")
    args = parser.parse_args()

    cfg = Config(vault_root=Path(args.vault))

    if args.backlog_add:
        path = add_item(cfg, args.backlog_add, args.desc, source="manual")
        print(str(path))
        return

    if args.backlog_import:
        paths = import_from_ideas(cfg)
        if paths:
            for p in paths:
                print(str(p))
        else:
            print("nothing new to import")
        return

    if args.backlog_spec:
        client = anthropic.Anthropic()
        paths = run_spec_generation(cfg, client=client)
        if paths:
            for p in paths:
                print(str(p))
        else:
            print("nothing to spec")
        return

    if args.research:
        client = anthropic.Anthropic()
        paths = run_research(cfg, client=client, today=args.date)
        if paths:
            for p in paths:
                print(str(p))
        else:
            print("nothing to research")
        return

    if args.ideas:
        client = anthropic.Anthropic()
        path = run_ideas(cfg, client=client, today=args.date)
        print(str(path) if path else "no recent notes")
        return

    if not cfg.interest_profile_path.exists():
        sys.exit(f"Missing interest profile at {cfg.interest_profile_path}")

    client = anthropic.Anthropic()  # resolves ANTHROPIC_API_KEY / ant auth profile
    result = run_pipeline(cfg, client=client, today=args.date)
    print(f"Ingested {len(result.ingested)} papers; {len(result.failures)} failures.")
    for f in result.failures:
        print(f"  FAIL {f}")
    _auto_commit(cfg.vault_root)


if __name__ == "__main__":
    main()
