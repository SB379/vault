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
