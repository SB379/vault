import anthropic
import httpx
import pytest

from arxiv_pipeline.gateway import CircuitBreaker, CircuitOpenError, with_retries


def _resp(status):
    return httpx.Response(status, request=httpx.Request("POST", "https://api.anthropic.com"))


def rate_limit_error():
    return anthropic.RateLimitError("rate limited", response=_resp(429), body=None)


def server_error():
    return anthropic.APIStatusError("server error", response=_resp(500), body=None)


def overloaded_error():
    return anthropic.APIStatusError(
        "overloaded", response=_resp(529),
        body={"type": "error", "error": {"type": "overloaded_error"}})


def test_retry_succeeds_after_two_failures():
    calls = {"n": 0}
    sleeps = []

    def flaky():
        calls["n"] += 1
        if calls["n"] <= 2:
            raise rate_limit_error()
        return "ok"

    assert with_retries(flaky, sleep_fn=sleeps.append) == "ok"
    assert calls["n"] == 3
    assert len(sleeps) == 2


def test_non_retryable_raises_immediately():
    calls = {"n": 0}

    def bad():
        calls["n"] += 1
        raise ValueError("logic bug")

    with pytest.raises(ValueError):
        with_retries(bad, sleep_fn=lambda s: None)
    assert calls["n"] == 1


def test_400_status_not_retryable():
    def bad():
        raise anthropic.APIStatusError("bad request", response=_resp(400), body=None)

    with pytest.raises(anthropic.APIStatusError):
        with_retries(bad, sleep_fn=lambda s: None)


@pytest.mark.parametrize("exc_factory", [
    server_error,
    overloaded_error,
    lambda: anthropic.APIConnectionError(request=httpx.Request("POST", "https://x")),
    lambda: __import__("requests").exceptions.ConnectionError("down"),
    lambda: __import__("requests").exceptions.Timeout("slow"),
])
def test_retryable_error_types_are_retried(exc_factory):
    calls = {"n": 0}

    def flaky():
        calls["n"] += 1
        if calls["n"] == 1:
            raise exc_factory()
        return "ok"

    assert with_retries(flaky, sleep_fn=lambda s: None) == "ok"


def test_exhausted_attempts_raises_last_error():
    def always():
        raise rate_limit_error()

    with pytest.raises(anthropic.RateLimitError):
        with_retries(always, attempts=3, sleep_fn=lambda s: None)


def test_jitter_bounded():
    sleeps = []
    calls = {"n": 0}

    def always():
        calls["n"] += 1
        raise rate_limit_error()

    with pytest.raises(anthropic.RateLimitError):
        with_retries(always, attempts=6, base_delay=2.0, max_delay=30.0,
                     sleep_fn=sleeps.append)
    assert len(sleeps) == 5
    for n, s in enumerate(sleeps):
        assert 0 <= s <= min(30.0, 2.0 * 2 ** n)


def test_breaker_opens_after_threshold():
    breaker = CircuitBreaker(threshold=3)
    for _ in range(3):
        breaker.record_failure()
    with pytest.raises(CircuitOpenError):
        breaker.check()


def test_breaker_success_resets_count():
    breaker = CircuitBreaker(threshold=3)
    breaker.record_failure()
    breaker.record_failure()
    breaker.record_success()
    breaker.record_failure()
    breaker.check()  # only 1 consecutive failure — still closed


def test_with_retries_records_into_breaker():
    breaker = CircuitBreaker(threshold=2)

    def always():
        raise rate_limit_error()

    with pytest.raises(anthropic.RateLimitError):
        with_retries(always, attempts=2, sleep_fn=lambda s: None, breaker=breaker)
    with pytest.raises(CircuitOpenError):
        breaker.check()

    breaker2 = CircuitBreaker(threshold=2)
    breaker2.record_failure()
    with_retries(lambda: "ok", sleep_fn=lambda s: None, breaker=breaker2)
    breaker2.check()  # success reset it
