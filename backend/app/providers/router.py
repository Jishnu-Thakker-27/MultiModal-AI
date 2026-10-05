import os
import logging
from typing import Dict, Any, List, Optional

from app.providers.base_provider import LLMProvider, ProviderResponse
from app.providers.circuit_breaker import circuit_breaker, ProviderHealthStatus
from app.providers.openai_provider import OpenAIProvider
from app.providers.gemini_provider import GeminiProvider
from app.providers.openrouter_provider import OpenRouterProvider
from app.providers.ollama_provider import OllamaProvider

logger = logging.getLogger("study_companion.providers.router")

class LLMProviderRouter:
    """
    Priority LLM Provider Router with Automatic Failover, Circuit Breaker Integration,
    and Multimodal Capability Matching.
    """
    def __init__(self, priority_list: Optional[List[str]] = None):
        # Instantiate available provider implementations
        self.providers: Dict[str, LLMProvider] = {
            "openai": OpenAIProvider(),
            "gemini": GeminiProvider(),
            "openrouter": OpenRouterProvider(),
            "ollama": OllamaProvider()
        }

        # Determine priority list from env or parameter
        if not priority_list:
            priority_str = os.getenv("LLM_PROVIDER_PRIORITY", "openai,gemini,openrouter,ollama")
            priority_list = [p.strip().lower() for p in priority_str.split(",") if p.strip()]

        self.priority_list = priority_list

    def register_provider(self, provider: LLMProvider):
        """Allows dynamically registering or overriding a provider."""
        self.providers[provider.name.lower()] = provider

    def get_candidate_providers(self, require_vision: bool = False) -> List[LLMProvider]:
        """Returns list of configured and capable providers in order of priority."""
        candidates = []
        for name in self.priority_list:
            provider = self.providers.get(name)
            if not provider:
                continue
            
            # Check configuration
            if not provider.is_configured():
                logger.debug(f"Router: Skipping '{name}' because it is not configured.")
                continue

            # Check vision capability requirement
            if require_vision and not provider.capabilities.get("vision", False):
                logger.info(f"Router: Skipping '{name}' for visual query because vision is not supported.")
                continue

            # Check Circuit Breaker health status
            status = circuit_breaker.get_status(name)
            if status != ProviderHealthStatus.AVAILABLE:
                logger.info(f"Router: Skipping '{name}' because Circuit Breaker status is '{status}'.")
                continue

            candidates.append(provider)

        return candidates

    def generate(
        self,
        prompt: str,
        system_prompt: str = "You are an expert AI Study Companion & Pedagogical Tutor.",
        image_paths: Optional[List[str]] = None
    ) -> ProviderResponse:
        """
        Executes text/multimodal generation across providers with automatic priority failover.
        """
        has_images = bool(image_paths and len(image_paths) > 0)
        candidates = self.get_candidate_providers(require_vision=has_images)

        if not candidates:
            # If vision was required, retry with all text candidates as fallback if user attached images
            if has_images:
                logger.warning("Router: No vision-capable providers available. Retrying without vision constraint.")
                candidates = self.get_candidate_providers(require_vision=False)

        if not candidates:
            err_msg = (
                "All configured LLM providers (OpenAI, Gemini, OpenRouter, Ollama) "
                "are currently unconfigured, rate-limited, or exhausted. "
                "Please verify your API keys or local LLM server status."
            )
            logger.error(f"Router Execution Failed: {err_msg}")
            return ProviderResponse(
                content="",
                provider_name="none",
                model_name="none",
                is_success=False,
                error_message=err_msg,
                is_retryable_error=True
            )

        attempted_errors = []

        for provider in candidates:
            logger.info(f"Router: Attempting generation with provider '{provider.name}' (Model: '{provider.model_name}')...")
            try:
                response = provider.generate(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    image_paths=image_paths
                )

                if response.is_success:
                    logger.info(f"Router: Generation SUCCESS via '{provider.name}' ({response.model_name}) in {response.latency_ms:.1f}ms.")
                    circuit_breaker.record_success(provider.name)
                    return response
                else:
                    err_detail = response.error_message or "Unknown provider failure"
                    err_lower = err_detail.lower()
                    
                    if any(kw in err_lower for kw in ["429", "quota", "credit", "rate limit", "resource_exhausted"]):
                        logger.warning(f"Router: Provider '{provider.name}' QUOTA_EXHAUSTED: {err_detail[:150]}")
                    else:
                        logger.warning(f"Router: Provider '{provider.name}' FAILED: {err_detail[:150]}")

                    circuit_breaker.record_failure(
                        provider_name=provider.name,
                        error_message=err_detail,
                        is_retryable=response.is_retryable_error
                    )
                    attempted_errors.append(f"[{provider.name}]: {err_detail[:150]}")

            except Exception as e:
                err_detail = str(e)
                logger.error(f"Router: Unexpected exception from '{provider.name}': {err_detail}")
                circuit_breaker.record_failure(
                    provider_name=provider.name,
                    error_message=err_detail,
                    is_retryable=True
                )
                attempted_errors.append(f"[{provider.name}]: {err_detail[:150]}")

        # If all candidates failed:
        combined_error = "All candidate providers failed: " + "; ".join(attempted_errors)
        logger.error(f"Router: Failover sequence exhausted. {combined_error}")
        return ProviderResponse(
            content="",
            provider_name="router_exhausted",
            model_name="none",
            is_success=False,
            error_message="Unable to generate response. All configured LLM providers failed or experienced quota limits.",
            is_retryable_error=True
        )

# Global singleton router instance
llm_router = LLMProviderRouter()
