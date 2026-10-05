import pytest
from unittest.mock import MagicMock, patch

from app.providers.base_provider import LLMProvider, ProviderResponse
from app.providers.circuit_breaker import CircuitBreaker, ProviderHealthStatus
from app.providers.router import LLMProviderRouter
from app.rag.generator import generate_grounded_answer

class DummySuccessProvider(LLMProvider):
    def __init__(self, provider_name: str, has_vision: bool = True):
        self._name = provider_name
        self._vision = has_vision

    @property
    def name(self) -> str:
        return self._name

    @property
    def model_name(self) -> str:
        return f"{self._name}-test-model"

    @property
    def capabilities(self):
        return {"text": True, "vision": self._vision, "structured_output": True}

    def is_configured(self) -> bool:
        return True

    def generate(self, prompt, system_prompt="", image_paths=None):
        return ProviderResponse(
            content=f"Synthesized explanation from {self._name}",
            provider_name=self._name,
            model_name=self.model_name,
            is_success=True,
            latency_ms=12.5
        )

class DummyFailingProvider(LLMProvider):
    def __init__(self, provider_name: str, error_msg: str = "429 Quota/Rate limit exceeded"):
        self._name = provider_name
        self.error_msg = error_msg

    @property
    def name(self) -> str:
        return self._name

    @property
    def model_name(self) -> str:
        return f"{self._name}-test-model"

    @property
    def capabilities(self):
        return {"text": True, "vision": True, "structured_output": True}

    def is_configured(self) -> bool:
        return True

    def generate(self, prompt, system_prompt="", image_paths=None):
        return ProviderResponse(
            content="",
            provider_name=self._name,
            model_name=self.model_name,
            is_success=False,
            error_message=self.error_msg,
            is_retryable_error=True,
            latency_ms=5.0
        )

def test_automatic_priority_failover():
    """Test that when Provider 1 fails with 429 quota error, Router fails over to Provider 2."""
    router = LLMProviderRouter(priority_list=["openai", "gemini", "openrouter"])
    
    openai_failing = DummyFailingProvider("openai", "429 credit_balance_exhausted")
    gemini_working = DummySuccessProvider("gemini")
    
    router.register_provider(openai_failing)
    router.register_provider(gemini_working)

    resp = router.generate("explain numerical integration")

    assert resp.is_success is True
    assert resp.provider_name == "gemini"
    assert "Synthesized explanation from gemini" in resp.content

def test_circuit_breaker_bypasses_failing_provider():
    """Test that after a 429 error, Circuit Breaker skips the failing provider on subsequent calls."""
    cb = CircuitBreaker(default_cooldown_seconds=300)
    cb.record_failure("openai", "429 credit_balance_exhausted")

    assert cb.get_status("openai") == ProviderHealthStatus.QUOTA_EXHAUSTED
    assert cb.is_available("openai") is False

def test_zero_raw_pdf_copy_paste_fallback():
    """Test that when ALL providers fail, generator returns service unavailable message and NO raw PDF text."""
    test_chunks = [{
        "chunk_id": "c1",
        "document_title": "Numerical Analysis",
        "page_number": 2,
        "content": "RAW PDF TEXT COPY PASTE SHOULD NEVER APPEAR AS LLM ANSWER",
        "final_score": 0.85,
        "page_type": "BODY_CONTENT"
    }]

    with patch("app.rag.generator.llm_router") as mock_router:
        mock_router.generate.return_value = ProviderResponse(
            content="",
            provider_name="none",
            model_name="none",
            is_success=False,
            error_message="All providers exhausted",
            is_retryable_error=True
        )

        answer, citations, is_grounded = generate_grounded_answer(
            query="numerical integration",
            chunks=test_chunks
        )

        assert is_grounded is False
        assert "Service Unavailable" in answer
        assert "RAW PDF TEXT COPY PASTE SHOULD NEVER APPEAR" not in answer
