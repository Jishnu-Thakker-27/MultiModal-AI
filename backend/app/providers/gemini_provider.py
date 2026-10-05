import os
import time
import json
import logging
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.error

from app.providers.base_provider import LLMProvider, ProviderResponse

logger = logging.getLogger("study_companion.providers.gemini")

class GeminiProvider(LLMProvider):
    """
    Google Gemini LLM Provider (supports text & vision models).
    Supports REST API calls with multi-key rotation and fallback across Gemini models.
    """
    def __init__(self):
        raw_keys = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
        self.api_keys = [k.strip() for k in raw_keys.split(",") if k.strip() and not k.strip().startswith("your_")]
        self._active_key_index = 0
        self._model_name = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

    @property
    def api_key(self) -> str:
        if not self.api_keys:
            return ""
        return self.api_keys[self._active_key_index % len(self.api_keys)]

    def rotate_key(self):
        if len(self.api_keys) > 1:
            self._active_key_index = (self._active_key_index + 1) % len(self.api_keys)
            logger.info(f"Rotated Gemini API key to index {self._active_key_index}")

    @property
    def name(self) -> str:
        return "gemini"

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
        return bool(self.api_keys)

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
                error_message="GEMINI_API_KEY is not configured.",
                is_retryable_error=False
            )

        start_time = time.time()
        
        # Build request payload
        full_system_and_prompt = f"{system_prompt}\n\nUser Question:\n{prompt}"
        parts = [{"text": full_system_and_prompt}]
        
        # Handle images if provided
        if image_paths and self.capabilities["vision"]:
            import base64
            for img_path in image_paths:
                if os.path.exists(img_path):
                    try:
                        with open(img_path, "rb") as f:
                            b64_data = base64.b64encode(f.read()).decode("utf-8")
                        mime_type = "image/png"
                        if img_path.lower().endswith((".jpg", ".jpeg")):
                            mime_type = "image/jpeg"
                        elif img_path.lower().endswith(".webp"):
                            mime_type = "image/webp"
                        parts.append({
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": b64_data
                            }
                        })
                    except Exception as e:
                        logger.warning(f"Failed to read image for Gemini: {img_path}: {e}")

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 4096
            }
        }

        # Build fallback model list with verified active models
        candidate_models = [self._model_name]
        for fallback in ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemma-4-26b-a4b-it", "gemini-flash-latest"]:
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        last_error = ""

        # Attempt calls across available API keys and candidate models
        for model in candidate_models:
            for key_attempt in range(len(self.api_keys)):
                current_key = self.api_key
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={current_key}"
                
                try:
                    req = urllib.request.Request(
                        url,
                        data=json.dumps(payload).encode("utf-8"),
                        headers={"Content-Type": "application/json"}
                    )
                    with urllib.request.urlopen(req, timeout=30) as response:
                        res_body = json.loads(response.read().decode("utf-8"))

                    latency = (time.time() - start_time) * 1000
                    
                    candidates = res_body.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts_res = candidates[0]["content"].get("parts", [])
                        text_res = "".join([p.get("text", "") for p in parts_res])
                        
                        usage_metadata = res_body.get("usageMetadata", {})
                        tokens_used = usage_metadata.get("totalTokenCount", None)

                        return ProviderResponse(
                            content=text_res,
                            provider_name=self.name,
                            model_name=model,
                            is_success=True,
                            tokens_used=tokens_used,
                            latency_ms=latency
                        )
                except urllib.error.HTTPError as e:
                    err_body = e.read().decode("utf-8") if e.fp else str(e)
                    last_error = f"HTTP {e.code} ({model}): {err_body[:200]}"
                    if e.code in (429, 503):
                        logger.warning(f"Gemini {e.code} limit on model '{model}'. Rotating key/model...")
                        if len(self.api_keys) > 1 and key_attempt < len(self.api_keys) - 1:
                            self.rotate_key()
                            time.sleep(0.5)
                            continue
                        else:
                            # Quota exhausted for this key; don't waste time retrying same exhausted key across models
                            break
                    elif e.code == 404:
                        logger.warning(f"Gemini model '{model}' not found (404). Trying next candidate...")
                        break
                    else:
                        break
                except Exception as e:
                    last_error = str(e)
                    logger.warning(f"Gemini provider exception on '{model}': {e}")
                    break

        return ProviderResponse(
            content="",
            provider_name=self.name,
            model_name=self.model_name,
            is_success=False,
            error_message=f"Gemini Provider exhausted: {last_error}",
            is_retryable_error=True,
            latency_ms=(time.time() - start_time) * 1000
        )

