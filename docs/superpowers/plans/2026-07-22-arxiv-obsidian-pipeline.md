# arXiv → Obsidian Daily Paper Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A locally scheduled Python pipeline that fetches new arXiv papers daily from six CS categories, LLM-scores them against an editable interest profile, deep-summarizes the top picks, and writes structured, wikilinked markdown notes into this Obsidian vault.

**Architecture:** Four-stage pipeline (fetch → score → summarize → write) orchestrated by a single CLI entry point, run daily by `launchd`. The vault is the knowledge base; a `_system/` folder holds the interest profile, concept vocabulary, and run state. Each stage is a focused module with its own tests; LLM calls go through the official `anthropic` SDK.

**Tech Stack:** Python 3.11+, `anthropic` (Claude API, model `claude-opus-4-8`), `feedparser` (arXiv Atom API), `requests` (HTTP), `pymupdf` (PDF text fallback), `pytest`, `launchd` for scheduling.

**Spec:** `docs/superpowers/specs/2026-07-22-arxiv-obsidian-pipeline-design.md`

**Conventions used throughout:**
- Vault root = repo root (`/Users/siddharthbalaji/Desktop/vault`). Pipeline code lives in `pipeline/`.
- All LLM calls use `model` values from config — never hardcoded at call sites.
- Tests never hit the network or the API: HTTP and Anthropic clients are injected and faked.

---

### Task 0: Repo + project scaffold

**Files:**
- Create: `.gitignore`, `pipeline/pyproject.toml`, `pipeline/arxiv_pipeline/__init__.py`, `pipeline/tests/__init__.py`

- [ ] **Step 1: Initialize git and scaffold**

```bash
cd /Users/siddharthbalaji/Desktop/vault
git init
mkdir -p pipeline/arxiv_pipeline pipeline/tests
touch pipeline/arxiv_pipeline/__init__.py pipeline/tests/__init__.py
```

- [ ] **Step 2: Write `.gitignore`**

```gitignore
.venv/
__pycache__/
*.pyc
.pytest_cache/
.DS_Store
pipeline/.env
```

- [ ] **Step 3: Write `pipeline/pyproject.toml`**

```toml
[project]
name = "arxiv-pipeline"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "anthropic>=0.116.0",
    "feedparser>=6.0",
    "requests>=2.32",
    "pymupdf>=1.24",
    "pyyaml>=6.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0"]

[project.scripts]
arxiv-pipeline = "arxiv_pipeline.cli:main"

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
include = ["arxiv_pipeline*"]
```

- [ ] **Step 4: Create venv, install, verify pytest runs**

```bash
cd pipeline
python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/pytest --version
```
Expected: pytest version prints.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold arxiv pipeline project"
```

---

### Task 1: Config module

**Files:**
- Create: `pipeline/arxiv_pipeline/config.py`
- Test: `pipeline/tests/test_config.py`

- [ ] **Step 1: Write the failing test**

```python
# pipeline/tests/test_config.py
from pathlib import Path
from arxiv_pipeline.config import Config


def test_default_config():
    cfg = Config(vault_root=Path("/tmp/vault"))
    assert cfg.categories == ["cs.CL", "cs.LG", "cs.SE", "cs.AI", "cs.IT", "cs.DB"]
    assert cfg.max_papers_per_day == 12
    assert cfg.score_threshold == 6
    assert cfg.scoring_model == "claude-opus-4-8"
    assert cfg.summary_model == "claude-opus-4-8"
    assert cfg.papers_dir == Path("/tmp/vault/Papers")
    assert cfg.daily_dir == Path("/tmp/vault/Daily")
    assert cfg.concepts_dir == Path("/tmp/vault/Concepts")
    assert cfg.system_dir == Path("/tmp/vault/_system")
    assert cfg.interest_profile_path == Path("/tmp/vault/_system/interest-profile.md")
    assert cfg.concepts_vocab_path == Path("/tmp/vault/_system/concepts.md")
    assert cfg.state_path == Path("/tmp/vault/_system/state.json")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd pipeline && .venv/bin/pytest tests/test_config.py -v`
Expected: FAIL with `ModuleNotFoundError` / `ImportError`.

- [ ] **Step 3: Implement**

```python
# pipeline/arxiv_pipeline/config.py
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Config:
    vault_root: Path
    categories: list[str] = field(
        default_factory=lambda: ["cs.CL", "cs.LG", "cs.SE", "cs.AI", "cs.IT", "cs.DB"]
    )
    max_papers_per_day: int = 12
    score_threshold: int = 6
    scoring_model: str = "claude-opus-4-8"
    summary_model: str = "claude-opus-4-8"

    @property
    def papers_dir(self) -> Path:
        return self.vault_root / "Papers"

    @property
    def daily_dir(self) -> Path:
        return self.vault_root / "Daily"

    @property
    def concepts_dir(self) -> Path:
        return self.vault_root / "Concepts"

    @property
    def system_dir(self) -> Path:
        return self.vault_root / "_system"

    @property
    def interest_profile_path(self) -> Path:
        return self.system_dir / "interest-profile.md"

    @property
    def concepts_vocab_path(self) -> Path:
        return self.system_dir / "concepts.md"

    @property
    def state_path(self) -> Path:
        return self.system_dir / "state.json"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest tests/test_config.py -v` — Expected: PASS

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: pipeline config"`

---

### Task 2: Paper model + arXiv fetcher

**Files:**
- Create: `pipeline/arxiv_pipeline/models.py`, `pipeline/arxiv_pipeline/fetch.py`
- Test: `pipeline/tests/test_fetch.py`

- [ ] **Step 1: Write `models.py` (plain dataclass, no test needed beyond fetch tests)**

```python
# pipeline/arxiv_pipeline/models.py
from dataclasses import dataclass, field


@dataclass
class Paper:
    arxiv_id: str          # e.g. "2607.01234v1" -> store WITHOUT version: "2607.01234"
    title: str
    abstract: str
    authors: list[str]
    categories: list[str]
    published: str         # ISO date "2026-07-21"
    url: str               # abs page url
    score: int | None = None
    score_reason: str = ""
```

- [ ] **Step 2: Write the failing tests**

The fetcher queries the arXiv Atom API (`http://export.arxiv.org/api/query`) per category, sorted by `submittedDate` descending, and parses entries with `feedparser`. We inject a `fetch_fn(url) -> str` returning raw Atom XML so tests are offline.

```python
# pipeline/tests/test_fetch.py
from arxiv_pipeline.fetch import parse_feed, dedupe, build_query_url

ATOM = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2607.01234v1</id>
    <title>Evaluating LLM Agents at Scale</title>
    <summary>We present a benchmark...</summary>
    <published>2026-07-21T17:59:00Z</published>
    <author><name>Ada Lovelace</name></author>
    <author><name>Alan Turing</name></author>
    <category term="cs.CL"/>
    <category term="cs.AI"/>
  </entry>
</feed>"""


def test_parse_feed():
    papers = parse_feed(ATOM)
    assert len(papers) == 1
    p = papers[0]
    assert p.arxiv_id == "2607.01234"          # version stripped
    assert p.title == "Evaluating LLM Agents at Scale"
    assert p.authors == ["Ada Lovelace", "Alan Turing"]
    assert p.categories == ["cs.CL", "cs.AI"]
    assert p.published == "2026-07-21"
    assert p.url == "https://arxiv.org/abs/2607.01234"


def test_dedupe_by_id():
    a = parse_feed(ATOM)[0]
    b = parse_feed(ATOM)[0]
    b.categories = ["cs.AI"]
    assert len(dedupe([a, b])) == 1


def test_build_query_url():
    url = build_query_url("cs.CL", max_results=100)
    assert "search_query=cat%3Acs.CL" in url or "search_query=cat:cs.CL" in url
    assert "sortBy=submittedDate" in url
    assert "max_results=100" in url
```

- [ ] **Step 3: Run tests to verify failure**

Run: `.venv/bin/pytest tests/test_fetch.py -v` — Expected: FAIL (ImportError).

- [ ] **Step 4: Implement `fetch.py`**

```python
# pipeline/arxiv_pipeline/fetch.py
import re
import time
from urllib.parse import urlencode

import feedparser
import requests

from .models import Paper

API_BASE = "http://export.arxiv.org/api/query"
ARXIV_RATE_LIMIT_SECONDS = 3  # arXiv asks for ~1 request / 3s


def build_query_url(category: str, max_results: int = 200) -> str:
    params = {
        "search_query": f"cat:{category}",
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "max_results": max_results,
    }
    return f"{API_BASE}?{urlencode(params)}"


def _strip_version(raw_id: str) -> str:
    # "http://arxiv.org/abs/2607.01234v1" -> "2607.01234"
    tail = raw_id.rsplit("/", 1)[-1]
    return re.sub(r"v\d+$", "", tail)


def parse_feed(xml: str) -> list[Paper]:
    feed = feedparser.parse(xml)
    papers = []
    for e in feed.entries:
        arxiv_id = _strip_version(e.id)
        papers.append(
            Paper(
                arxiv_id=arxiv_id,
                title=" ".join(e.title.split()),
                abstract=" ".join(e.summary.split()),
                authors=[a.name for a in e.get("authors", [])],
                categories=[t["term"] for t in e.get("tags", [])],
                published=e.published[:10],
                url=f"https://arxiv.org/abs/{arxiv_id}",
            )
        )
    return papers


def dedupe(papers: list[Paper]) -> list[Paper]:
    seen: dict[str, Paper] = {}
    for p in papers:
        seen.setdefault(p.arxiv_id, p)
    return list(seen.values())


def fetch_recent(categories: list[str], since: str, fetch_fn=None) -> list[Paper]:
    """Fetch recent submissions across categories, keeping papers published on/after `since` (ISO date)."""
    if fetch_fn is None:
        def fetch_fn(url: str) -> str:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            return resp.text

    all_papers: list[Paper] = []
    for i, cat in enumerate(categories):
        if i > 0:
            time.sleep(ARXIV_RATE_LIMIT_SECONDS)
        all_papers.extend(parse_feed(fetch_fn(build_query_url(cat))))
    return [p for p in dedupe(all_papers) if p.published >= since]
```

- [ ] **Step 5: Run tests to verify pass**

Run: `.venv/bin/pytest tests/test_fetch.py -v` — Expected: PASS

- [ ] **Step 6: Commit** — `git commit -am "feat: arxiv fetcher with dedupe and rate limiting"`

---

### Task 3: LLM relevance scorer

**Files:**
- Create: `pipeline/arxiv_pipeline/score.py`
- Test: `pipeline/tests/test_score.py`

Design: one API call scores a batch of up to 25 abstracts (title + abstract each) against the interest profile, returning structured JSON via `output_config.format` (json_schema). Client is injected for tests.

- [ ] **Step 1: Write the failing test**

```python
# pipeline/tests/test_score.py
import json
from types import SimpleNamespace

from arxiv_pipeline.models import Paper
from arxiv_pipeline.score import score_papers


def make_paper(i):
    return Paper(
        arxiv_id=f"2607.0000{i}", title=f"Paper {i}", abstract="About evals.",
        authors=["A"], categories=["cs.CL"], published="2026-07-21",
        url=f"https://arxiv.org/abs/2607.0000{i}",
    )


class FakeClient:
    def __init__(self, payload):
        self.payload = payload
        self.calls = []
        self.messages = self

    def create(self, **kwargs):
        self.calls.append(kwargs)
        text_block = SimpleNamespace(type="text", text=json.dumps(self.payload))
        return SimpleNamespace(content=[text_block], stop_reason="end_turn")


def test_score_papers_assigns_scores():
    papers = [make_paper(1), make_paper(2)]
    payload = {"scores": [
        {"arxiv_id": "2607.00001", "score": 8, "reason": "core evals work"},
        {"arxiv_id": "2607.00002", "score": 3, "reason": "off-topic"},
    ]}
    client = FakeClient(payload)
    scored = score_papers(papers, profile="I care about evals.", client=client, model="claude-opus-4-8")
    by_id = {p.arxiv_id: p for p in scored}
    assert by_id["2607.00001"].score == 8
    assert by_id["2607.00002"].score == 3
    assert by_id["2607.00001"].score_reason == "core evals work"
    # profile text made it into the prompt
    assert "I care about evals." in client.calls[0]["messages"][0]["content"]


def test_unscored_paper_defaults_to_zero():
    papers = [make_paper(1)]
    client = FakeClient({"scores": []})
    scored = score_papers(papers, profile="x", client=client, model="claude-opus-4-8")
    assert scored[0].score == 0
```

- [ ] **Step 2: Run to verify failure** — `.venv/bin/pytest tests/test_score.py -v` → FAIL

- [ ] **Step 3: Implement `score.py`**

```python
# pipeline/arxiv_pipeline/score.py
import json

from .models import Paper

BATCH_SIZE = 25

SCORE_SCHEMA = {
    "type": "object",
    "properties": {
        "scores": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "arxiv_id": {"type": "string"},
                    "score": {"type": "integer"},
                    "reason": {"type": "string"},
                },
                "required": ["arxiv_id", "score", "reason"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["scores"],
    "additionalProperties": False,
}

PROMPT = """You are filtering new arXiv papers for an AI engineer. Their interest profile:

<interest_profile>
{profile}
</interest_profile>

Score each paper below 0-10 for how much this reader would benefit from a deep read.
10 = squarely in their interests with practical takeaways; 0 = irrelevant.
Give a one-sentence reason per paper.

<papers>
{papers}
</papers>"""


def _render(papers: list[Paper]) -> str:
    return "\n\n".join(
        f"[{p.arxiv_id}] {p.title}\n{p.abstract}" for p in papers
    )


def score_papers(papers: list[Paper], profile: str, client, model: str) -> list[Paper]:
    for i in range(0, len(papers), BATCH_SIZE):
        batch = papers[i : i + BATCH_SIZE]
        response = client.messages.create(
            model=model,
            max_tokens=4096,
            output_config={"format": {"type": "json_schema", "schema": SCORE_SCHEMA}},
            messages=[{"role": "user", "content": PROMPT.format(profile=profile, papers=_render(batch))}],
        )
        text = next(b.text for b in response.content if b.type == "text")
        scores = {s["arxiv_id"]: s for s in json.loads(text)["scores"]}
        for p in batch:
            entry = scores.get(p.arxiv_id)
            p.score = entry["score"] if entry else 0
            p.score_reason = entry["reason"] if entry else ""
    return papers
```

Note: the fake in the test exposes `client.messages.create` via `self.messages = self` — the real `anthropic.Anthropic()` client matches this call shape.

- [ ] **Step 4: Run to verify pass** — `.venv/bin/pytest tests/test_score.py -v` → PASS

- [ ] **Step 5: Commit** — `git commit -am "feat: LLM relevance scorer with structured output"`

---

### Task 4: Full-text downloader

**Files:**
- Create: `pipeline/arxiv_pipeline/fulltext.py`
- Test: `pipeline/tests/test_fulltext.py`

Design: try `https://arxiv.org/html/{id}` (arXiv's HTML rendering); if it 404s or errors, download `https://arxiv.org/pdf/{id}` and extract text with pymupdf. Returns plain text truncated to a character cap (papers can be huge; 150K chars ≈ well within the 1M context). HTTP is injected.

- [ ] **Step 1: Write the failing test**

```python
# pipeline/tests/test_fulltext.py
import pytest
from arxiv_pipeline.fulltext import get_fulltext, html_to_text


class FakeResp:
    def __init__(self, status, text="", content=b""):
        self.status_code = status
        self.text = text
        self.content = content


def test_html_path_used_when_available():
    def fake_get(url, timeout):
        assert "html" in url
        return FakeResp(200, text="<html><body><p>Hello world.</p><script>x</script></body></html>")

    text = get_fulltext("2607.00001", get_fn=fake_get)
    assert "Hello world." in text
    assert "script" not in text


def test_html_to_text_strips_tags():
    assert html_to_text("<p>a</p><style>s</style><div>b</div>") == "a\nb"


def test_truncation():
    def fake_get(url, timeout):
        return FakeResp(200, text="<p>" + "x" * 200_000 + "</p>")

    assert len(get_fulltext("2607.00001", get_fn=fake_get, max_chars=1000)) == 1000


def test_pdf_fallback_on_404():
    calls = []

    def fake_get(url, timeout):
        calls.append(url)
        if "html" in url:
            return FakeResp(404)
        return FakeResp(200, content=b"%PDF-fake")

    def fake_pdf_extract(data):
        return "extracted pdf text"

    text = get_fulltext("2607.00001", get_fn=fake_get, pdf_extract_fn=fake_pdf_extract)
    assert text == "extracted pdf text"
    assert any("pdf" in u for u in calls)
```

- [ ] **Step 2: Run to verify failure** — FAIL (ImportError)

- [ ] **Step 3: Implement `fulltext.py`**

```python
# pipeline/arxiv_pipeline/fulltext.py
import re

import requests

MAX_CHARS = 150_000


def html_to_text(html: str) -> str:
    html = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", "", html)
    html = re.sub(r"(?i)</(p|div|h[1-6]|li|tr|section)>", "\n", html)
    text = re.sub(r"<[^>]+>", "", html)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n\s*\n+", "\n", text).strip()


def _extract_pdf_text(data: bytes) -> str:
    import fitz  # pymupdf

    doc = fitz.open(stream=data, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)


def get_fulltext(arxiv_id: str, get_fn=None, pdf_extract_fn=None, max_chars: int = MAX_CHARS) -> str:
    get_fn = get_fn or (lambda url, timeout: requests.get(url, timeout=timeout))
    pdf_extract_fn = pdf_extract_fn or _extract_pdf_text

    resp = get_fn(f"https://arxiv.org/html/{arxiv_id}", timeout=60)
    if resp.status_code == 200 and resp.text:
        return html_to_text(resp.text)[:max_chars]

    pdf = get_fn(f"https://arxiv.org/pdf/{arxiv_id}", timeout=120)
    if pdf.status_code != 200:
        raise RuntimeError(f"could not download {arxiv_id}: html={resp.status_code}, pdf={pdf.status_code}")
    return pdf_extract_fn(pdf.content)[:max_chars]
```

- [ ] **Step 4: Run to verify pass** — PASS

- [ ] **Step 5: Commit** — `git commit -am "feat: full-text downloader with PDF fallback"`

---

### Task 5: Summarizer

**Files:**
- Create: `pipeline/arxiv_pipeline/summarize.py`
- Test: `pipeline/tests/test_summarize.py`

Design: one streaming API call per paper (full text is long → stream, get final message). Structured output gives us the note sections plus concept assignments (existing concepts preferred, new ones proposed separately).

- [ ] **Step 1: Write the failing test**

```python
# pipeline/tests/test_summarize.py
import json
from types import SimpleNamespace
from contextlib import contextmanager

from arxiv_pipeline.models import Paper
from arxiv_pipeline.summarize import summarize_paper, Summary


class FakeStreamClient:
    def __init__(self, payload):
        self.payload = payload
        self.calls = []
        self.messages = self

    @contextmanager
    def stream(self, **kwargs):
        self.calls.append(kwargs)
        payload = self.payload

        class S:
            def get_final_message(self):
                block = SimpleNamespace(type="text", text=json.dumps(payload))
                return SimpleNamespace(content=[block], stop_reason="end_turn")

        yield S()


PAYLOAD = {
    "tldr": "Big result.",
    "key_topics": ["LLM-as-judge", "Agent Evaluation"],
    "new_concepts": ["Rubric Drift"],
    "highlights": ["h1", "h2"],
    "method": "They did X.",
    "evals_results": "Beat baseline by 4pts on Y.",
    "practitioner_takeaways": "Use X when Z.",
    "open_questions": "Small n.",
}


def test_summarize_paper():
    paper = Paper(arxiv_id="2607.00001", title="T", abstract="A", authors=["A"],
                  categories=["cs.CL"], published="2026-07-21", url="u")
    client = FakeStreamClient(PAYLOAD)
    s = summarize_paper(paper, fulltext="full text here",
                        known_concepts=["LLM-as-judge", "Agent Evaluation"],
                        client=client, model="claude-opus-4-8")
    assert isinstance(s, Summary)
    assert s.tldr == "Big result."
    assert s.key_topics == ["LLM-as-judge", "Agent Evaluation"]
    assert s.new_concepts == ["Rubric Drift"]
    sent = client.calls[0]["messages"][0]["content"]
    assert "full text here" in sent
    assert "LLM-as-judge" in sent  # vocabulary included in prompt
```

- [ ] **Step 2: Run to verify failure** — FAIL

- [ ] **Step 3: Implement `summarize.py`**

```python
# pipeline/arxiv_pipeline/summarize.py
import json
from dataclasses import dataclass

from .models import Paper

SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "tldr": {"type": "string"},
        "key_topics": {"type": "array", "items": {"type": "string"}},
        "new_concepts": {"type": "array", "items": {"type": "string"}},
        "highlights": {"type": "array", "items": {"type": "string"}},
        "method": {"type": "string"},
        "evals_results": {"type": "string"},
        "practitioner_takeaways": {"type": "string"},
        "open_questions": {"type": "string"},
    },
    "required": ["tldr", "key_topics", "new_concepts", "highlights", "method",
                 "evals_results", "practitioner_takeaways", "open_questions"],
    "additionalProperties": False,
}


@dataclass
class Summary:
    tldr: str
    key_topics: list[str]
    new_concepts: list[str]
    highlights: list[str]
    method: str
    evals_results: str
    practitioner_takeaways: str
    open_questions: str


PROMPT = """You are writing a structured study note for an AI engineer focused on AI engineering, \
evaluations, agents, RAG, and production LLM systems. Summarize the paper below so the reader can \
learn from the note alone, without opening the paper.

Concept vocabulary (assign key_topics ONLY from this list; if an important concept is genuinely \
missing, propose it under new_concepts instead):
<concepts>
{concepts}
</concepts>

Sections:
- tldr: 2-3 sentences — the claim and why it matters.
- key_topics: 2-6 entries from the vocabulary above.
- new_concepts: 0-3 proposed additions to the vocabulary (empty if none needed).
- highlights: 3-7 of the most important findings, with numbers where available.
- method: how they did it, at implementer depth.
- evals_results: benchmarks used, baselines, what actually moved.
- practitioner_takeaways: how this could change how the reader builds or evaluates systems.
- open_questions: weaknesses and what to be skeptical of.

Paper: {title} ({arxiv_id})

<paper_text>
{fulltext}
</paper_text>"""


def summarize_paper(paper: Paper, fulltext: str, known_concepts: list[str], client, model: str) -> Summary:
    prompt = PROMPT.format(
        concepts="\n".join(known_concepts),
        title=paper.title,
        arxiv_id=paper.arxiv_id,
        fulltext=fulltext,
    )
    with client.messages.stream(
        model=model,
        max_tokens=16000,
        output_config={"format": {"type": "json_schema", "schema": SUMMARY_SCHEMA}},
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        response = stream.get_final_message()
    text = next(b.text for b in response.content if b.type == "text")
    return Summary(**json.loads(text))
```

- [ ] **Step 4: Run to verify pass** — PASS

- [ ] **Step 5: Commit** — `git commit -am "feat: full-text summarizer with structured note sections"`

---

### Task 6: Vault writer (notes, concepts, digest, state)

**Files:**
- Create: `pipeline/arxiv_pipeline/vault.py`
- Test: `pipeline/tests/test_vault.py`

Design: pure file operations against `Config` paths, using `tmp_path` in tests. Responsibilities: slugify, render paper note markdown, touch concept pages, append backlink context, render daily digest, read/write run state (`state.json` holds `ingested_ids` and `last_run_date` for idempotency), load/save concept vocabulary.

- [ ] **Step 1: Write the failing tests**

```python
# pipeline/tests/test_vault.py
import json
from pathlib import Path

from arxiv_pipeline.config import Config
from arxiv_pipeline.models import Paper
from arxiv_pipeline.summarize import Summary
from arxiv_pipeline import vault


def make_cfg(tmp_path) -> Config:
    return Config(vault_root=tmp_path)


def make_paper():
    return Paper(arxiv_id="2607.00001", title="Evaluating LLM Agents: A Study",
                 abstract="We study agents.", authors=["Ada Lovelace"],
                 categories=["cs.CL"], published="2026-07-21",
                 url="https://arxiv.org/abs/2607.00001", score=8, score_reason="core")


def make_summary():
    return Summary(tldr="Big result.", key_topics=["LLM-as-judge"], new_concepts=["Rubric Drift"],
                   highlights=["h1", "h2"], method="M", evals_results="E",
                   practitioner_takeaways="P", open_questions="O")


def test_slugify():
    assert vault.slugify("Evaluating LLM Agents: A Study!") == "evaluating-llm-agents-a-study"


def test_write_paper_note(tmp_path):
    cfg = make_cfg(tmp_path)
    path = vault.write_paper_note(cfg, make_paper(), make_summary())
    assert path == cfg.papers_dir / "2026" / "07" / "evaluating-llm-agents-a-study.md"
    text = path.read_text()
    assert "arxiv_id: \"2607.00001\"" in text
    assert "[[LLM-as-judge]]" in text
    assert "## Abstract" in text and "We study agents." in text
    assert "## Evals & Results" in text
    assert "score: 8" in text


def test_ensure_concept_pages(tmp_path):
    cfg = make_cfg(tmp_path)
    vault.ensure_concept_pages(cfg, ["LLM-as-judge"])
    page = cfg.concepts_dir / "LLM-as-judge.md"
    assert page.exists()
    before = page.read_text()
    vault.ensure_concept_pages(cfg, ["LLM-as-judge"])  # idempotent
    assert page.read_text() == before


def test_state_roundtrip(tmp_path):
    cfg = make_cfg(tmp_path)
    assert vault.load_state(cfg) == {"ingested_ids": [], "failed": []}
    vault.save_state(cfg, {"ingested_ids": ["2607.00001"], "failed": []})
    assert vault.load_state(cfg)["ingested_ids"] == ["2607.00001"]


def test_concept_vocab_roundtrip(tmp_path):
    cfg = make_cfg(tmp_path)
    assert vault.load_concepts(cfg) == []
    vault.save_concepts(cfg, ["Agent Evaluation", "LLM-as-judge"])
    assert vault.load_concepts(cfg) == ["Agent Evaluation", "LLM-as-judge"]


def test_write_daily_digest(tmp_path):
    cfg = make_cfg(tmp_path)
    p = make_paper()
    path = vault.write_daily_digest(
        cfg, date="2026-07-22",
        entries=[(p, "evaluating-llm-agents-a-study")],
        failures=["2607.99999: download failed"],
        proposed_concepts=["Rubric Drift"],
    )
    text = path.read_text()
    assert path == cfg.daily_dir / "2026-07-22.md"
    assert "[[evaluating-llm-agents-a-study]]" in text
    assert "score 8" in text
    assert "Rubric Drift" in text
    assert "2607.99999" in text
```

- [ ] **Step 2: Run to verify failure** — FAIL

- [ ] **Step 3: Implement `vault.py`**

```python
# pipeline/arxiv_pipeline/vault.py
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
title: "{title}"
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


def write_paper_note(cfg: Config, paper: Paper, summary: Summary) -> Path:
    year, month = paper.published[:4], paper.published[5:7]
    out_dir = cfg.papers_dir / year / month
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{slugify(paper.title)}.md"
    path.write_text(NOTE_TEMPLATE.format(
        arxiv_id=paper.arxiv_id,
        title=paper.title.replace('"', "'"),
        authors=", ".join(f'"{a}"' for a in paper.authors),
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
        page = cfg.concepts_dir / f"{c}.md"
        if not page.exists():
            page.write_text(f"# {c}\n\nPapers touching this concept appear as backlinks.\n")


def load_state(cfg: Config) -> dict:
    if cfg.state_path.exists():
        return json.loads(cfg.state_path.read_text())
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
```

- [ ] **Step 4: Run to verify pass** — `.venv/bin/pytest tests/test_vault.py -v` → PASS

- [ ] **Step 5: Commit** — `git commit -am "feat: vault writer (notes, concepts, digest, state)"`

---

### Task 7: Pipeline orchestrator + CLI

**Files:**
- Create: `pipeline/arxiv_pipeline/run.py`, `pipeline/arxiv_pipeline/cli.py`
- Test: `pipeline/tests/test_run.py`

Design: `run_pipeline(cfg, client, today, fetch_fn=None, fulltext_fn=None)` wires the stages: load state/profile/concepts → fetch since yesterday → drop already-ingested → score → select (threshold + cap) → for each: fulltext → summarize → write note + concept pages (approved concepts only; proposed ones go to digest) → digest → save state. Failures are caught per-paper and recorded. `cli.py` is a thin argparse wrapper.

- [ ] **Step 1: Write the failing test**

```python
# pipeline/tests/test_run.py
from arxiv_pipeline.config import Config
from arxiv_pipeline.models import Paper
from arxiv_pipeline.summarize import Summary
from arxiv_pipeline import run as run_mod
from arxiv_pipeline import vault


def test_run_pipeline_end_to_end(tmp_path, monkeypatch):
    cfg = Config(vault_root=tmp_path, max_papers_per_day=2, score_threshold=6)
    cfg.system_dir.mkdir(parents=True)
    cfg.interest_profile_path.write_text("evals and agents")
    vault.save_concepts(cfg, ["LLM-as-judge"])

    papers = [
        Paper(arxiv_id=f"2607.0000{i}", title=f"Paper {i}", abstract="A", authors=["X"],
              categories=["cs.CL"], published="2026-07-21", url=f"u{i}")
        for i in range(1, 4)
    ]
    monkeypatch.setattr(run_mod, "fetch_recent", lambda cats, since, fetch_fn=None: papers)

    def fake_score(ps, profile, client, model):
        for i, p in enumerate(ps):
            p.score = [9, 7, 2][i]
            p.score_reason = "r"
        return ps
    monkeypatch.setattr(run_mod, "score_papers", fake_score)
    monkeypatch.setattr(run_mod, "get_fulltext", lambda aid, **kw: "text")
    monkeypatch.setattr(run_mod, "summarize_paper", lambda p, fulltext, known_concepts, client, model: Summary(
        tldr="t", key_topics=["LLM-as-judge"], new_concepts=["New Thing"], highlights=["h"],
        method="m", evals_results="e", practitioner_takeaways="p", open_questions="o"))

    result = run_mod.run_pipeline(cfg, client=None, today="2026-07-22")

    assert len(result.ingested) == 2          # score 2 filtered out
    assert (cfg.daily_dir / "2026-07-22.md").exists()
    assert (cfg.concepts_dir / "LLM-as-judge.md").exists()
    assert not (cfg.concepts_dir / "New Thing.md").exists()  # proposed, not auto-created
    assert "New Thing" in (cfg.daily_dir / "2026-07-22.md").read_text()
    state = vault.load_state(cfg)
    assert set(state["ingested_ids"]) == {"2607.00001", "2607.00002"}

    # idempotency: second run ingests nothing new
    result2 = run_mod.run_pipeline(cfg, client=None, today="2026-07-22")
    assert result2.ingested == []


def test_per_paper_failure_recorded(tmp_path, monkeypatch):
    cfg = Config(vault_root=tmp_path, score_threshold=0)
    cfg.system_dir.mkdir(parents=True)
    cfg.interest_profile_path.write_text("x")
    papers = [Paper(arxiv_id="2607.00009", title="Bad", abstract="A", authors=["X"],
                    categories=["cs.CL"], published="2026-07-21", url="u")]
    monkeypatch.setattr(run_mod, "fetch_recent", lambda *a, **k: papers)
    monkeypatch.setattr(run_mod, "score_papers", lambda ps, **k: [setattr(p, "score", 9) or p for p in ps])

    def boom(aid, **kw):
        raise RuntimeError("download failed")
    monkeypatch.setattr(run_mod, "get_fulltext", boom)

    result = run_mod.run_pipeline(cfg, client=None, today="2026-07-22")
    assert result.ingested == []
    assert "2607.00009" in result.failures[0]
    assert "download failed" in (cfg.daily_dir / "2026-07-22.md").read_text()
```

- [ ] **Step 2: Run to verify failure** — FAIL

- [ ] **Step 3: Implement `run.py`**

```python
# pipeline/arxiv_pipeline/run.py
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
    papers = [p for p in papers if p.arxiv_id not in state["ingested_ids"]]

    papers = score_papers(papers, profile=profile, client=client, model=cfg.scoring_model)
    selected = sorted(
        [p for p in papers if (p.score or 0) >= cfg.score_threshold],
        key=lambda p: p.score or 0, reverse=True,
    )[: cfg.max_papers_per_day]

    entries: list[tuple] = []
    proposed: set[str] = set()
    for paper in selected:
        try:
            fulltext = get_fulltext(paper.arxiv_id)
            summary = summarize_paper(paper, fulltext=fulltext, known_concepts=concepts,
                                      client=client, model=cfg.summary_model)
            vault.write_paper_note(cfg, paper, summary)
            vault.ensure_concept_pages(cfg, [t for t in summary.key_topics if t in concepts])
            proposed.update(summary.new_concepts)
            entries.append((paper, vault.slugify(paper.title)))
            state["ingested_ids"].append(paper.arxiv_id)
            result.ingested.append(paper.arxiv_id)
        except Exception as e:  # per-paper isolation: one failure never kills the run
            result.failures.append(f"{paper.arxiv_id}: {e}")

    vault.write_daily_digest(cfg, date=today, entries=entries,
                             failures=result.failures, proposed_concepts=sorted(proposed))
    vault.save_state(cfg, state)
    return result
```

- [ ] **Step 4: Implement `cli.py`**

```python
# pipeline/arxiv_pipeline/cli.py
import argparse
import datetime
import sys
from pathlib import Path

import anthropic

from .config import Config
from .run import run_pipeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Daily arXiv -> Obsidian pipeline")
    parser.add_argument("--vault", default=str(Path(__file__).resolve().parents[2]),
                        help="Vault root (defaults to repo root)")
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
```

- [ ] **Step 5: Run full suite** — `.venv/bin/pytest -v` → all PASS

- [ ] **Step 6: Commit** — `git commit -am "feat: pipeline orchestrator and CLI"`

---

### Task 8: Seed vault system files

**Files:**
- Create: `_system/interest-profile.md`, `_system/concepts.md`

- [ ] **Step 1: Write `_system/interest-profile.md`**

```markdown
# Interest profile

I am an AI engineer. Score papers highly when they help me:

- **Evaluations**: LLM benchmarks, eval harness design, LLM-as-judge, rubric design,
  agent evaluation, reliability measurement, regression testing for models.
- **AI engineering**: building production LLM systems, prompt engineering, RAG,
  context management, agent architectures, tool use, orchestration frameworks.
- **Agents**: planning, multi-agent systems, long-horizon tasks, computer use,
  coding agents.
- **Systems**: serving, latency/cost optimization, caching, fine-tuning in practice.

Score low: pure theory without applications, domain-specific applications far from
software engineering (e.g., medical imaging), classical information theory with no
ML connection, incremental benchmark-chasing without new insight.
```

- [ ] **Step 2: Write `_system/concepts.md`** (seed vocabulary)

```markdown
# Concept vocabulary

- Agent Evaluation
- Agent Architectures
- Benchmarks
- Chain-of-Thought
- Coding Agents
- Context Management
- Evaluation Harnesses
- Fine-tuning
- Hallucination
- LLM-as-judge
- Long-horizon Tasks
- Multi-agent Systems
- Prompt Engineering
- RAG
- Reasoning Models
- Reinforcement Learning
- Reward Models
- Serving & Inference
- Tool Use
- Synthetic Data
```

- [ ] **Step 3: Commit** — `git add _system && git commit -m "feat: seed interest profile and concept vocabulary"`

---

### Task 9: Live smoke test

- [ ] **Step 1: Verify API credentials** — run `ant auth status` or check `echo $ANTHROPIC_API_KEY`. If neither is set, ask the user to run `ant auth login` or export a key.

- [ ] **Step 2: Run the pipeline once manually**

```bash
cd /Users/siddharthbalaji/Desktop/vault/pipeline
.venv/bin/arxiv-pipeline
```
Expected: prints `Ingested N papers; M failures.` with N in 1–12; `Papers/2026/07/*.md`, `Daily/<today>.md`, and `Concepts/*.md` appear in the vault. Open the daily digest in Obsidian and sanity-check note quality.

- [ ] **Step 3: Verify idempotency** — run the same command again; expected output `Ingested 0 papers` (same day, all IDs already in state).

- [ ] **Step 4: Commit any generated system-file changes** — `git add -A && git commit -m "chore: first live run"` (generated `Papers/`, `Daily/`, `Concepts/` may be committed or gitignored per user preference — ask the user).

---

### Task 10: launchd scheduling

**Files:**
- Create: `pipeline/com.sid.arxiv-pipeline.plist`

- [ ] **Step 1: Write the plist** (7:00 AM daily; `RunAtLoad` false so it only fires on schedule; logs to `_system/logs/`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.sid.arxiv-pipeline</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/siddharthbalaji/Desktop/vault/pipeline/.venv/bin/arxiv-pipeline</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
    <key>StandardOutPath</key>
    <string>/Users/siddharthbalaji/Desktop/vault/_system/logs/pipeline.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/siddharthbalaji/Desktop/vault/_system/logs/pipeline.err</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>ANTHROPIC_API_KEY</key><string>REPLACE_ME_OR_DELETE_IF_USING_ANT_PROFILE</string>
    </dict>
</dict>
</plist>
```

Note: if the user authenticates via `ant auth login` profile rather than an env key, delete the `EnvironmentVariables` block — the SDK resolves the profile from disk.

- [ ] **Step 2: Install and load**

```bash
mkdir -p /Users/siddharthbalaji/Desktop/vault/_system/logs
cp pipeline/com.sid.arxiv-pipeline.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.sid.arxiv-pipeline.plist
launchctl list | grep arxiv
```
Expected: job listed.

- [ ] **Step 3: Trigger a test fire** — `launchctl start com.sid.arxiv-pipeline`, then check `_system/logs/pipeline.log` shows the "Ingested" line (0 papers is fine if today already ran).

- [ ] **Step 4: Commit** — `git commit -am "feat: launchd daily schedule at 7am"`

---

## Post-plan notes (not tasks)

- **Cost lever:** both model fields default to `claude-opus-4-8`. If daily scoring cost is a concern, `scoring_model` can be pointed at a cheaper model in one line — user's call.
- **Spec deviation — "Related" note section:** the per-note Related list is served by Obsidian backlinks on shared concept pages instead of a computed section (same information, zero extra pipeline logic). Revisit if backlinks prove insufficient.
- **Deferred per spec:** vector index, HF Daily Papers blending, figure extraction, cloud runs.
- **Tuning loop:** edit `_system/interest-profile.md` to change what gets selected; approve proposed concepts by adding them to `_system/concepts.md`.
