from arxiv_pipeline.health import check_ideas, check_summary
from arxiv_pipeline.summarize import Summary

LONG_FULLTEXT = "paper content " * 200  # > 2000 chars


def healthy_summary(**overrides):
    fields = dict(
        tldr="This paper shows a substantial improvement in agent evaluation methods.",
        key_topics=["evals"],
        new_concepts=["Semantic Probing"],
        highlights=["Improves accuracy by 12%"],
        method="They construct a benchmark of 500 tasks and run each agent " * 3,
        evals_results="On the benchmark the method beats all baselines by a wide margin " * 2,
        practitioner_takeaways="Use semantic checks.",
        open_questions="Small sample.",
    )
    fields.update(overrides)
    return Summary(**fields)


def test_healthy_summary_passes():
    assert check_summary(healthy_summary(), LONG_FULLTEXT, ["evals"]) == []


def test_short_tldr_flagged():
    problems = check_summary(healthy_summary(tldr="too short"), LONG_FULLTEXT, ["evals"])
    assert any("tldr" in p for p in problems)


def test_empty_highlights_flagged():
    problems = check_summary(healthy_summary(highlights=[]), LONG_FULLTEXT, ["evals"])
    assert any("highlights" in p for p in problems)


def test_short_method_evals_flagged():
    problems = check_summary(healthy_summary(method="m", evals_results="e"),
                             LONG_FULLTEXT, ["evals"])
    assert any("method" in p for p in problems)


def test_stray_key_topic_flagged():
    problems = check_summary(healthy_summary(key_topics=["evals", "Unknown Topic"]),
                             LONG_FULLTEXT, ["evals"])
    assert any("Unknown Topic" in p for p in problems)


def test_zero_topics_and_concepts_flagged():
    problems = check_summary(healthy_summary(key_topics=[], new_concepts=[]),
                             LONG_FULLTEXT, ["evals"])
    assert any("key_topics" in p and "new_concepts" in p for p in problems)


def test_short_fulltext_flagged():
    problems = check_summary(healthy_summary(), "stub page", ["evals"])
    assert any("fulltext" in p for p in problems)


def _idea(**overrides):
    d = {"title": "T", "description": "D", "rationale": "R", "source_slugs": []}
    d.update(overrides)
    return d


def test_healthy_ideas_pass():
    assert check_ideas({"pipeline_improvements": [_idea()], "build_ideas": [_idea()]}) == []


def test_both_lists_empty_flagged():
    problems = check_ideas({"pipeline_improvements": [], "build_ideas": []})
    assert problems


def test_idea_missing_title_or_description_flagged():
    problems = check_ideas({
        "pipeline_improvements": [_idea(title="")],
        "build_ideas": [_idea(description="")],
    })
    assert len(problems) == 2
