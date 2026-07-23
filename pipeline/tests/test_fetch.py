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


def test_fetch_recent_skips_failing_category(monkeypatch):
    import arxiv_pipeline.fetch as fetch_mod
    monkeypatch.setattr(fetch_mod.time, "sleep", lambda s: None)

    def flaky(url):
        if "cs.LG" in url:
            raise TimeoutError("read timed out")
        return ATOM

    papers = fetch_mod.fetch_recent(["cs.CL", "cs.LG"], since="2026-07-20", fetch_fn=flaky)
    assert len(papers) == 1  # cs.CL parsed; cs.LG skipped after retry
