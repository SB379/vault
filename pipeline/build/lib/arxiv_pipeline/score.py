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
        # A failed batch degrades to score 0 (skipped today, retried while in the
        # fetch window) instead of aborting the whole run.
        try:
            response = client.messages.create(
                model=model,
                max_tokens=8192,
                output_config={"format": {"type": "json_schema", "schema": SCORE_SCHEMA}},
                messages=[{"role": "user", "content": PROMPT.format(profile=profile, papers=_render(batch))}],
            )
            text = next((b.text for b in response.content if b.type == "text"), None)
            if text is None or response.stop_reason not in ("end_turn", "stop_sequence"):
                raise RuntimeError(f"unusable scoring response (stop_reason={response.stop_reason})")
            scores = {s["arxiv_id"]: s for s in json.loads(text)["scores"]}
        except Exception:
            scores = {}
        for p in batch:
            entry = scores.get(p.arxiv_id)
            p.score = entry["score"] if entry else 0
            p.score_reason = entry["reason"] if entry else ""
    return papers
