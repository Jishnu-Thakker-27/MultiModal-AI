import numpy as np
import logging
import hashlib
from typing import List
from app.config import settings

logger = logging.getLogger("study_companion.rag.embeddings")

ENGLISH_STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at",
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "could",
    "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has", "have",
    "he", "her", "here", "his", "how", "i", "if", "in", "into", "is", "it", "its", "me", "more", "most", "my",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "our", "out", "over", "own", "same",
    "she", "should", "so", "some", "such", "than", "that", "the", "their", "them", "then", "there", "these",
    "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "were", "what", "when",
    "where", "which", "while", "who", "why", "with", "would", "you", "your"
}

def generate_embedding(text: str) -> List[float]:
    """
    Generates 1536-dimensional vector embedding.
    Uses OpenAI embedding API if configured, otherwise deterministic MD5 hash-vector fallback.
    """
    if not text or not text.strip():
        return [0.0] * 1536

    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            res = client.embeddings.create(
                input=text,
                model=settings.EMBEDDING_MODEL
            )
            return res.data[0].embedding
        except Exception as e:
            logger.warning(f"OpenAI embedding generation failed ({e}). Using deterministic hash embedding generator.")

    # 100% Deterministic MD5 hash vector fallback for offline/demo development
    all_words = text.lower().split()
    words = [w for w in all_words if w not in ENGLISH_STOP_WORDS and len(w) > 1]
    if not words:
        words = all_words

    vector = np.zeros(1536, dtype=np.float32)
    for w in words:
        # MD5 digest ensures identical feature mapping across Python restarts
        idx = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16) % 1536
        vector[idx] += 1.0
    
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm
    return vector.tolist()

def generate_batch_embeddings(texts: List[str]) -> List[List[float]]:
    return [generate_embedding(t) for t in texts]

