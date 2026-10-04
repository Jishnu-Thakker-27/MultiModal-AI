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
        import re
        # Extract target concept from teaching plan if present
        target_match = re.search(r'- Target Concept:\s*(.+)', prompt)
        concept = target_match.group(1).strip() if target_match else ""

        if not concept:
            student_match = re.search(r'STUDENT QUESTION:\s*(.+)', prompt)
            concept = student_match.group(1).strip() if student_match else "Concept"

        content = f"Synthesized pedagogical explanation: {concept} is defined and explained in detail."
        if "least-squares" in prompt.lower() or "least squares" in prompt.lower():
            content = f"The method of least squares minimizes the sum of squared residuals y = a + bx for {concept}."
        elif "forward difference" in prompt.lower():
            content = f"Forward difference operator Delta f(x) = f(x+h) - f(x) for {concept}."
        elif "b tree" in prompt.lower() or "b-tree" in prompt.lower():
            content = f"A B-tree is defined as a self-balancing search tree for {concept}."

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
