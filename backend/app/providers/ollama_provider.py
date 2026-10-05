import os
import time
import json
import logging
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.error

from app.providers.base_provider import LLMProvider, ProviderResponse

logger = logging.getLogger("study_companion.providers.ollama")

class OllamaProvider(LLMProvider):
    """
    Local Ollama LLM Provider (Offline fallback at http://localhost:11434).
    Runs models like llama3, mistral, phi3, llava locally without external API keys or cloud quotas.
    """
    def __init__(self):
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
        self._model_name = os.getenv("OLLAMA_MODEL", "llama3")

    @property
    def name(self) -> str:
        return "ollama"

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def capabilities(self) -> Dict[str, Any]:
        return {
            "text": True,
            "vision": "llava" in self.model_name.lower(),
            "structured_output": False
        }

    def is_configured(self) -> bool:
        """Checks if local Ollama daemon is active and responsive."""
        if os.getenv("OLLAMA_ENABLED", "true").lower() == "false":
            return False
        try:
            url = f"{self.base_url}/api/tags"
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=1.5) as response:
                if response.status == 200:
                    return True
        except Exception:
            pass
        return False

    def generate(
        self,
        prompt: str,
        system_prompt: str = "You are an expert AI Study Companion & Pedagogical Tutor.",
        image_paths: Optional[List[str]] = None
    ) -> ProviderResponse:
        start_time = time.time()
        url = f"{self.base_url}/api/chat"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]

        images_b64 = []
        if image_paths and self.capabilities["vision"]:
            import base64
            for img_path in image_paths:
                if os.path.exists(img_path):
                    try:
                        with open(img_path, "rb") as f:
                            images_b64.append(base64.b64encode(f.read()).decode("utf-8"))
                    except Exception as e:
                        logger.warning(f"Failed to read image for Ollama: {e}")

        payload = {
            "model": self.model_name,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.3
            }
        }
        if images_b64:
            payload["messages"][-1]["images"] = images_b64

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=45) as response:
                res_body = json.loads(response.read().decode("utf-8"))

            latency = (time.time() - start_time) * 1000
            
            message = res_body.get("message", {})
            content = message.get("content", "")

            if content:
                return ProviderResponse(
                    content=content,
                    provider_name=self.name,
                    model_name=self.model_name,
                    is_success=True,
                    latency_ms=latency
                )
            else:
                return ProviderResponse(
                    content="",
                    provider_name=self.name,
                    model_name=self.model_name,
                    is_success=False,
                    error_message="Ollama returned empty message content.",
                    is_retryable_error=True,
                    latency_ms=latency
                )

        except urllib.error.HTTPError as e:
            latency = (time.time() - start_time) * 1000
            err_body = e.read().decode("utf-8") if e.fp else str(e)
            return ProviderResponse(
                content="",
                provider_name=self.name,
                model_name=self.model_name,
                is_success=False,
                error_message=f"Ollama HTTP {e.code}: {err_body}",
                is_retryable_error=True,
                latency_ms=latency
            )

        except Exception as e:
            latency = (time.time() - start_time) * 1000
            logger.error(f"Ollama Provider Exception: {e}")
            return ProviderResponse(
                content="",
                provider_name=self.name,
                model_name=self.model_name,
                is_success=False,
                error_message=f"Ollama server connection failed: {e}",
                is_retryable_error=True,
                latency_ms=latency
            )
