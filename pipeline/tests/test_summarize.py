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
