import argparse
import datetime
import sys
from pathlib import Path

import anthropic

from .config import Config
from .run import run_pipeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Daily arXiv -> Obsidian pipeline")
    parser.add_argument("--vault", default=str(Path.cwd()),
                        help="Vault root (defaults to current directory)")
    parser.add_argument("--date", default=datetime.date.today().isoformat())
    args = parser.parse_args()

    cfg = Config(vault_root=Path(args.vault))
    if not cfg.interest_profile_path.exists():
        sys.exit(f"Missing interest profile at {cfg.interest_profile_path}")

    client = anthropic.Anthropic()  # resolves ANTHROPIC_API_KEY / ant auth profile
    result = run_pipeline(cfg, client=client, today=args.date)
    print(f"Ingested {len(result.ingested)} papers; {len(result.failures)} failures.")
    for f in result.failures:
        print(f"  FAIL {f}")


if __name__ == "__main__":
    main()
