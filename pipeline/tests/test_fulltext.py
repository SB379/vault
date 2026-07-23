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


def test_pdf_fallback_on_html_fetch_exception():
    def fake_get(url, timeout):
        if "html" in url:
            raise ConnectionError("boom")
        return FakeResp(200, content=b"%PDF-fake")

    def fake_pdf_extract(data):
        return "extracted pdf text"

    assert get_fulltext("2607.00001", get_fn=fake_get, pdf_extract_fn=fake_pdf_extract) == "extracted pdf text"


def test_html_entities_unescaped():
    assert html_to_text("<p>a &amp; b</p>") == "a & b"
