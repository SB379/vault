import re
import time
from urllib.parse import urlencode

import feedparser
import requests

from .models import Paper

API_BASE = "http://export.arxiv.org/api/query"
ARXIV_RATE_LIMIT_SECONDS = 3  # arXiv asks for ~1 request / 3s


def build_query_url(category: str, max_results: int = 1000) -> str:
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
