import argparse
import datetime
import sys
from pathlib import Path

import anthropic

from .config import Config
from .ideas import run_ideas
from .run import run_pipeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Daily arXiv -> Obsidian pipeline")
    parser.add_argument("--vault", default=str(Path.cwd()),
                        help="Vault root (defaults to current directory)")
    parser.add_argument("--date", default=datetime.date.today().isoformat())
    parser.add_argument("--ideas", action="store_true",
                        help="Skip ingestion; only (re)generate the ideas note")
    args = parser.parse_args()

    cfg = Config(vault_root=Path(args.vault))

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


if __name__ == "__main__":
    main()
