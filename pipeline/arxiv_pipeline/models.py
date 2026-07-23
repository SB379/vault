from dataclasses import dataclass


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
