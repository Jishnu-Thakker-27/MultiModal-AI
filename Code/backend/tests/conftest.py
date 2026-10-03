import pytest
from app.providers.base_provider import LLMProvider, ProviderResponse
from app.providers.router import llm_router

class PytestMockLLMProvider(LLMProvider):
    """
    Automatic mock provider registered for unit testing.
    Ensures tests pass deterministically without depending on external cloud API quotas.
    """
    @property
    def name(self) -> str:
        return "mock_test_provider"

    @property
    def model_name(self) -> str:
        return "mock-test-v1"

    @property
    def capabilities(self):
        return {"text": True, "vision": True, "structured_output": True}

    def is_configured(self) -> bool:
        return True

    def generate(self, prompt, system_prompt="", image_paths=None):
        # Extract context or topic keywords from prompt to generate realistic pedagogical response
        content = "Synthesized pedagogical explanation: Curve fitting and self-balancing B Tree structures are defined mathematically."
        if "least-squares" in prompt.lower() or "least squares" in prompt.lower():
            content = "The method of least squares minimizes the sum of squared residuals y = a + bx."
        elif "forward difference" in prompt.lower():
            content = "Forward difference operator Delta f(x) = f(x+h) - f(x)."
        elif "b tree" in prompt.lower() or "b-tree" in prompt.lower():
            content = "A B-tree is defined as a self-balancing search tree."

        return ProviderResponse(
            content=content,
            provider_name=self.name,
            model_name=self.model_name,
            is_success=True,
            latency_ms=1.0
        )

@pytest.fixture(autouse=True)
def setup_mock_llm_provider():
    """Autouse fixture to register mock test provider for pytest suite execution."""
    mock_p = PytestMockLLMProvider()
    llm_router.register_provider(mock_p)
    original_priority = llm_router.priority_list
    llm_router.priority_list = ["mock_test_provider"] + original_priority
    yield
    llm_router.priority_list = original_priority
