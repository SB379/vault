"""Shared resilience layer for LLM/API calls: retries with jitter + circuit breaker."""
import random
import time

import anthropic
import requests


class CircuitOpenError(RuntimeError):
    pass


class CircuitBreaker:
    """Counts consecutive failures across calls; opens at `threshold`.

    Simple in-process object, no persistence. A success resets the count.
    """

    def __init__(self, threshold: int = 3):
        self.threshold = threshold
        self.failures = 0

    def check(self) -> None:
        if self.failures >= self.threshold:
            raise CircuitOpenError(
                f"circuit open after {self.failures} consecutive failures")

    def record_failure(self) -> None:
        self.failures += 1

    def record_success(self) -> None:
        self.failures = 0


_RETRYABLE_TYPES = (
    anthropic.APIConnectionError,
    requests.exceptions.ConnectionError,
    requests.exceptions.Timeout,
)


def _is_retryable(exc: Exception, extra: tuple = ()) -> bool:
    if isinstance(exc, anthropic.RateLimitError):
        return True
    if isinstance(exc, anthropic.APIStatusError):
        if exc.status_code >= 500:
            return True
        body = getattr(exc, "body", None)
        if isinstance(body, dict):
            err = body.get("error", body)
            if isinstance(err, dict) and err.get("type") == "overloaded_error":
                return True
        return False
    return isinstance(exc, _RETRYABLE_TYPES + tuple(extra))


def with_retries(fn, *, attempts: int = 4, base_delay: float = 2.0,
                 max_delay: float = 30.0, retryable: tuple = (),
                 sleep_fn=time.sleep, breaker: CircuitBreaker | None = None):
    """Call fn() with exponential backoff and full jitter on transient errors.

    Retryable: anthropic RateLimitError, APIStatusError >= 500 or
    overloaded_error, APIConnectionError, requests ConnectionError/Timeout,
    plus any extra types in `retryable`. Non-retryable errors propagate
    immediately. Failures/successes are recorded into `breaker` if given, and
    breaker.check() runs before each attempt.
    """
    for n in range(attempts):
        if breaker is not None:
            breaker.check()
        try:
            result = fn()
        except Exception as e:
            if breaker is not None:
                breaker.record_failure()
            if not _is_retryable(e, retryable) or n == attempts - 1:
                raise
            sleep_fn(random.uniform(0, min(max_delay, base_delay * 2 ** n)))
        else:
            if breaker is not None:
                breaker.record_success()
            return result
