import os
import time
import json
import logging
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.error

from app.providers.base_provider import LLMProvider, ProviderResponse

logger = logging.getLogger("study_companion.providers.openrouter")

class OpenRouterProvider(LLMProvider):
    """
    OpenRouter LLM Gateway Provider (Supports access to Llama 3, Claude 3.5, Mistral, OpenAI, DeepSeek, etc.).
    Uses OpenAI-compatible REST API interface.
    """
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self._model_name = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")

    @property
    def name(self) -> str:
        return "openrouter"

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def capabilities(self) -> Dict[str, Any]:
        return {
            "text": True,
            "vision": True,
            "structured_output": True
        }

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip() and not self.api_key.startswith("your_"))

    def generate(
        self,
        prompt: str,
        system_prompt: str = "You are an expert AI Study Companion & Pedagogical Tutor.",
        image_paths: Optional[List[str]] = None
    ) -> ProviderResponse:
        if not self.is_configured():
            return ProviderResponse(
                content="",
                provider_name=self.name,
                model_name=self.model_name,
                is_success=False,
                error_message="OPENROUTER_API_KEY is not configured.",
                is_retryable_error=False
            )

        start_time = time.time()
        url = "https://openrouter.ai/api/v1/chat/completions"

        messages = [
            {"role": "system", "content": system_prompt}
        ]

        if image_paths and self.capabilities["vision"]:
            import base64
            content_items = [{"type": "text", "text": prompt}]
            for img_path in image_paths:
                if os.path.exists(img_path):
                    try:
                        with open(img_path, "rb") as f:
                            b64_data = base64.b64encode(f.read()).decode("utf-8")
                        mime_type = "image/png"
                        if img_path.lower().endswith((".jpg", ".jpeg")):
                            mime_type = "image/jpeg"
                        content_items.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime_type};base64,{b64_data}"}
                        })
                    except Exception as e:
                        logger.warning(f"Failed to load image for OpenRouter: {img_path}: {e}")
            messages.append({"role": "user", "content": content_items})
        else:
            messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 2048
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/study-companion",
            "X-Title": "AI Study Companion"
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                res_body = json.loads(response.read().decode("utf-8"))

            latency = (time.time() - start_time) * 1000
            
            choices = res_body.get("choices", [])
            if choices and "message" in choices[0]:
                content = choices[0]["message"].get("content", "")
                usage = res_body.get("usage", {})
                tokens_used = usage.get("total_tokens", None)

                return ProviderResponse(
                    content=content,
                    provider_name=self.name,
                    model_name=self.model_name,
                    is_success=True,
                    tokens_used=tokens_used,
                    latency_ms=latency
                )
            else:
                return ProviderResponse(
                    content="",
                    provider_name=self.name,
                    model_name=self.model_name,
                    is_success=False,
                    error_message="OpenRouter returned empty response choice.",
                    is_retryable_error=True,
                    latency_ms=latency
                )

        except urllib.error.HTTPError as e:
            latency = (time.time() - start_time) * 1000
            err_body = e.read().decode("utf-8") if e.fp else str(e)
            err_msg = f"HTTP {e.code}: {err_body}"
            logger.error(f"OpenRouter API HTTP Error ({e.code}): {err_body[:200]}")
            
            is_retryable = True
            if e.code in (401, 403):
                is_retryable = False
            elif e.code == 429:
                err_msg = f"429 Quota/Rate limit exceeded: {err_body}"

            return ProviderResponse(
                content="",
                provider_name=self.name,
                model_name=self.model_name,
                is_success=False,
                error_message=err_msg,
                is_retryable_error=is_retryable,
                latency_ms=latency
            )

        except Exception as e:
            latency = (time.time() - start_time) * 1000
            logger.error(f"OpenRouter Provider Exception: {e}")
            return ProviderResponse(
                content="",
                provider_name=self.name,
                model_name=self.model_name,
                is_success=False,
                error_message=str(e),
                is_retryable_error=True,
                latency_ms=latency
            )
