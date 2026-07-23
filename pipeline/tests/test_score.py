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


def test_failed_batch_degrades_to_zero():
    class BoomClient:
        def __init__(self):
            self.messages = self

        def create(self, **kwargs):
            raise RuntimeError("api down")

    papers = [make_paper(1)]
    scored = score_papers(papers, profile="x", client=BoomClient(), model="m")
    assert scored[0].score == 0
    assert scored[0].score_reason == ""
