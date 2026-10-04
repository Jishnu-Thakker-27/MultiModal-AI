import os
import time
import logging
import base64
from typing import Dict, Any, List, Optional
from app.providers.base_provider import LLMProvider, ProviderResponse
from app.config import settings

logger = logging.getLogger("study_companion.providers.openai")

class OpenAIProvider(LLMProvider):
    """
    OpenAI API Provider (gpt-4o-mini, gpt-4o).
    Supports text generation, vision page image analysis, and error classification.
    """
    def __init__(self):
        self._api_key = (os.getenv("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", "") or "").strip()
        self._model = (os.getenv("OPENAI_MODEL") or settings.OPENAI_MODEL or settings.LLM_MODEL).strip()

    @property
    def name(self) -> str:
        return "openai"

    @property
    def model_name(self) -> str:
        return self._model

    @property
    def capabilities(self) -> Dict[str, Any]:
        return {
            "text": True,
            "vision": True,
            "structured_output": True
        }

    def is_configured(self) -> bool:
        return bool(self._api_key and len(self._api_key) > 5)

    def _encode_image_to_base64(self, image_path: str) -> Optional[str]:
        if not os.path.exists(image_path):
            return None
        try:
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            logger.debug(f"Failed to encode image {image_path}: {e}")
            return None

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
                error_message="OPENAI_API_KEY is not configured",
                is_retryable_error=False
            )

        start_time = time.time()
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self._api_key)

            user_content = []
            user_content.append({"type": "text", "text": prompt})

            # Attach base64 page images if visual question
            if image_paths:
                for img_path in image_paths:
                    b64_str = self._encode_image_to_base64(img_path)
                    if b64_str:
                        user_content.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{b64_str}"}
                        })

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content if image_paths else prompt}
            ]

            response = client.chat.completions.create(
                model=self._model,
                messages=messages,
                temperature=0.2
            )

            latency = (time.time() - start_time) * 1000
            content = response.choices[0].message.content.strip()
            tokens = response.usage.total_tokens if response.usage else None

            return ProviderResponse(
                content=content,
                provider_name=self.name,
                model_name=self._model,
                is_success=True,
                tokens_used=tokens,
                latency_ms=latency
            )
        except Exception as e:
            latency = (time.time() - start_time) * 1000
            err_msg = str(e)
            logger.warning(f"OpenAIProvider error: {err_msg}")
            
            # Classify if error is retryable (429, quota, rate limit, timeout, server 5xx)
            is_retryable = any(kw in err_msg.lower() for kw in ["429", "quota", "credit", "rate", "limit", "timeout", "500", "503", "connection"])
            
            return ProviderResponse(
                content="",
                provider_name=self.name,
                model_name=self.model_name,
                is_success=False,
                error_message=err_msg,
                is_retryable_error=is_retryable,
                latency_ms=latency
            )
