import numpy as np
import logging
from typing import List
from app.config import settings

logger = logging.getLogger("study_companion.rag.embeddings")

def generate_embedding(text: str) -> List[float]:
    """
    Generates 1536-dimensional vector embedding.
    Uses OpenAI embedding API if configured, otherwise deterministic hash-vector fallback.
    """
    if not text or not text.strip():
        return [0.0] * 1536

    if settings.OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            res = client.embeddings.create(
                input=text,
                model=settings.EMBEDDING_MODEL
            )
            return res.data[0].embedding
        except Exception as e:
            logger.warning(f"OpenAI embedding generation failed ({e}). Using hash embedding generator.")

    # Deterministic vector fallback for offline/demo development
    words = text.lower().split()
    vector = np.zeros(1536, dtype=np.float32)
    for w in words:
        idx = abs(hash(w)) % 1536
        vector[idx] += 1.0
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm
    return vector.tolist()

def generate_batch_embeddings(texts: List[str]) -> List[List[float]]:
    return [generate_embedding(t) for t in texts]
