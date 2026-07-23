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
