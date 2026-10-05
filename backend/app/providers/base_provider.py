from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, List, Optional

@dataclass
class ProviderResponse:
    content: str
    provider_name: str
    model_name: str
    is_success: bool
    error_message: Optional[str] = None
    is_retryable_error: bool = True
    tokens_used: Optional[int] = None
    latency_ms: Optional[float] = None

class LLMProvider(ABC):
    """
    Abstract Base Class for Provider-Agnostic LLM Providers.
    Exposes unified text generation, multimodal vision capabilities, and error classification.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the provider (e.g. 'openai', 'gemini', 'openrouter', 'ollama')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Model identifier configured for this provider."""
        pass

    @property
    @abstractmethod
    def capabilities(self) -> Dict[str, Any]:
        """
        Provider capability registry dict.
        Keys: 'text' (bool), 'vision' (bool), 'structured_output' (bool)
        """
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if provider has valid API key / base URL configuration."""
        pass

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_prompt: str = "You are an expert AI Study Companion & Pedagogical Tutor.",
        image_paths: Optional[List[str]] = None
    ) -> ProviderResponse:
        """Generates response using provider inference API or local server."""
        pass
