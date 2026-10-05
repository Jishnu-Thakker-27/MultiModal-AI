import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("study_companion.providers.circuit_breaker")

class ProviderHealthStatus:
    AVAILABLE = "AVAILABLE"
    RATE_LIMITED = "RATE_LIMITED"
    QUOTA_EXHAUSTED = "QUOTA_EXHAUSTED"
    UNAVAILABLE = "UNAVAILABLE"
    INVALID_CONFIGURATION = "INVALID_CONFIGURATION"

class CircuitBreaker:
    """
    Provider Health Tracker & Circuit Breaker.
    Prevents repeated calls to known-failing or quota-exhausted LLM providers during cooldown window.
    """
    def __init__(self, default_cooldown_seconds: int = 300):
        self.default_cooldown = default_cooldown_seconds
        self._provider_status: Dict[str, str] = {}
        self._cooldown_expiry: Dict[str, float] = {}
        self._failure_counts: Dict[str, int] = {}

    def get_status(self, provider_name: str) -> str:
        now = time.time()
        # Check if cooldown has expired
        if provider_name in self._cooldown_expiry:
            if now >= self._cooldown_expiry[provider_name]:
                logger.info(f"Circuit Breaker: Cooldown expired for provider '{provider_name}'. Resetting to AVAILABLE.")
                self.reset(provider_name)

        return self._provider_status.get(provider_name, ProviderHealthStatus.AVAILABLE)

    def is_available(self, provider_name: str) -> bool:
        status = self.get_status(provider_name)
        return status in [ProviderHealthStatus.AVAILABLE]

    def record_success(self, provider_name: str):
        self._provider_status[provider_name] = ProviderHealthStatus.AVAILABLE
        self._failure_counts[provider_name] = 0
        if provider_name in self._cooldown_expiry:
            del self._cooldown_expiry[provider_name]

    def record_failure(
        self,
        provider_name: str,
        error_message: str,
        is_retryable: bool = True,
        cooldown_seconds: Optional[int] = None
    ):
        now = time.time()
        cooldown = cooldown_seconds or self.default_cooldown
        err_lower = (error_message or "").lower()

        if "429" in err_lower or "quota" in err_lower or "credit_balance_exhausted" in err_lower:
            status = ProviderHealthStatus.QUOTA_EXHAUSTED
            cooldown = max(cooldown, 300)
        elif "rate" in err_lower and "limit" in err_lower:
            status = ProviderHealthStatus.RATE_LIMITED
            cooldown = max(cooldown, 60)
        elif not is_retryable or "invalid_api_key" in err_lower or "authentication" in err_lower:
            status = ProviderHealthStatus.INVALID_CONFIGURATION
            cooldown = 86400  # 24 hours for config errors
        else:
            status = ProviderHealthStatus.UNAVAILABLE
            cooldown = 5  # 5s cooldown for transient 500/503 errors


        self._provider_status[provider_name] = status
        self._cooldown_expiry[provider_name] = now + cooldown
        self._failure_counts[provider_name] = self._failure_counts.get(provider_name, 0) + 1

        logger.warning(f"Circuit Breaker: Provider '{provider_name}' marked as {status} (Cooldown: {cooldown}s). Cause: {error_message[:100]}")

    def reset(self, provider_name: str):
        self._provider_status[provider_name] = ProviderHealthStatus.AVAILABLE
        self._failure_counts[provider_name] = 0
        self._cooldown_expiry.pop(provider_name, None)

# Global singleton circuit breaker instance
circuit_breaker = CircuitBreaker()
