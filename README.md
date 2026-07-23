# vault — arXiv research pipeline + dashboard

A self-updating research knowledge base: every morning it fetches new arXiv papers,
scores them against a personal interest profile, deep-summarizes the best ones into
structured Obsidian notes, links them into a concept graph, and synthesizes ideas for
what to improve and build next. A local Next.js dashboard renders it all — reading
list, paper detail with embedded PDFs, trends, a link graph, and generated ideas.

```
arXiv (cs.CL, cs.LG, cs.SE, cs.AI, cs.IT, cs.DB)
   │  fetch (Atom API, deduped, rate-limited)
   ▼
score ── Claude Haiku vs _system/interest-profile.md (0–10 per abstract)
   ▼  top N ≥ threshold
summarize ── Claude Opus over full text (arXiv HTML → PDF fallback)
   ▼
Obsidian vault ── Papers/YYYY/MM/*.md · Daily/*.md digests · Concepts/*.md
   ▼                 wikilinked via a controlled concept vocabulary
ideas ── weekly-window synthesis → Ideas/*.md (pipeline improvements + build ideas)
   ▼
dashboard ── Next.js (localhost + LAN/iPad): Today · Papers · Trends · Graph · Ideas
```

## Layout

| Path | What it is |
|---|---|
| `pipeline/` | Python pipeline (`arxiv_pipeline` package, pytest suite, launchd plist) |
| `dashboard/` | Next.js 16 dashboard (App Router, Tailwind, Recharts, force-graph) |
| `Papers/` `Daily/` `Concepts/` `Ideas/` | Generated vault content (markdown, wikilinked) |
| `_system/` | `interest-profile.md` (edit to tune selection), `concepts.md` (approved vocabulary), `state.json` (idempotency), `logs/` |
| `docs/superpowers/` | Design specs and implementation plans |

## Daily operation

A launchd job (`com.sid.arxiv-pipeline`, 7:00 AM) runs `arxiv-pipeline`, which is
idempotent per day: already-ingested papers are skipped, failures are recorded in the
daily digest and retried while inside the 2-day fetch window. The morning entry point
is `Daily/YYYY-MM-DD.md` — every ingested paper with its score rationale, plus newly
proposed concepts awaiting approval (approve by adding them to `_system/concepts.md`).

Manual runs:

```bash
cd pipeline
.venv/bin/arxiv-pipeline                 # full run (from vault root as cwd)
.venv/bin/arxiv-pipeline --ideas         # regenerate the ideas note only
.venv/bin/pytest                         # test suite
```

After code changes: `.venv/bin/pip install .` (install is non-editable — the
Homebrew Python 3.13.0 `site` bug skips `__editable__*.pth` files).

### Backlog

`Backlog/` holds a queue of improvement items (`NNN-<slug>.md`), each moving
through `proposed` → `specced` → `done`:

```bash
.venv/bin/arxiv-pipeline --backlog-add "Title" --desc "Description"   # manual item
.venv/bin/arxiv-pipeline --backlog-import   # pull Pipeline improvements from Ideas notes (deduped by title)
.venv/bin/arxiv-pipeline --backlog-spec     # Opus writes ## Spec + ## Build plan into each proposed item
```

Specced items are detailed enough for a future coding session to execute
without further design discussion; mark them `done` by hand after shipping.
They render on the dashboard's Backlog page.

## Dashboard

```bash
cd dashboard
npm run dev -- -H 0.0.0.0    # serves localhost:3000 + LAN devices (allowedDevOrigins)
npm run test                 # vitest suite
```

Read-only over the vault (fresh filesystem reads per request — refresh shows new
data), except `POST /api/ideas`, which shells out to `arxiv-pipeline --ideas`.

## Configuration

All knobs live in `pipeline/arxiv_pipeline/config.py`: categories, models
(scoring/summary/ideas), score threshold, per-run paper cap, ideas window. The
Anthropic API key lives only in the (gitignored) launchd plist; the dashboard reads
it at runtime via PlistBuddy.

## Costs

~$3–6/day at defaults (Haiku scoring ≈ cents; Opus full-text summaries dominate).
Levers, in order of preference: Batch API for summaries (−50%, no quality loss),
Sonnet summaries (−40%, small quality loss), local model for scoring (≈ free, minor
loss). See `Ideas/` — the pipeline critiques itself daily.
