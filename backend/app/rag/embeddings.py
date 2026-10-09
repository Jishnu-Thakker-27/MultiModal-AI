import os
import numpy as np
import logging
import hashlib
from typing import List
from app.config import settings

logger = logging.getLogger("study_companion.rag.embeddings")

_ST_MODEL = None


class EmbeddingGenerationError(RuntimeError):
    """Raised when no semantic embedding provider is available.

    Hash vectors can make unrelated text appear relevant.  Failing ingestion is
    safer than silently building an unreliable source-grounding index.
    """

def get_sentence_transformer_model():
    """Lazily load local sentence transformer model for 100% offline embedding generation."""
    global _ST_MODEL
    if _ST_MODEL is None:
        try:
            from sentence_transformers import SentenceTransformer
            model_name = os.getenv("EMBEDDING_MODEL_LOCAL", "all-MiniLM-L6-v2")
            logger.info(f"Loading local SentenceTransformer model '{model_name}'...")
            try:
                _ST_MODEL = SentenceTransformer(model_name, local_files_only=True)
            except Exception:
                _ST_MODEL = SentenceTransformer(model_name)
            logger.info("SentenceTransformer model loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer ({e}). Local fallback active.")
            _ST_MODEL = False
    return _ST_MODEL if _ST_MODEL is not False else None

def generate_embedding(text: str) -> List[float]:
    """
    Generates vector embedding for document chunk indexing and user search query matching.
    Priority:
    1. Local SentenceTransformer ('all-MiniLM-L6-v2') -> 384 dimensions (padded or exact)
    2. OpenAI Embeddings API (if configured and working) -> 1536 dimensions
    3. Deterministic word-feature TF-IDF vector generator -> 1536 dimensions
    """
    if not text or not text.strip():
        return [0.0] * 1536

    # 1. Attempt local SentenceTransformer first for 100% offline reliability
    st_model = get_sentence_transformer_model()
    if st_model is not None:
        try:
            emb = st_model.encode(text, convert_to_numpy=True)
            # Pad to 1536 if database expects 1536d or return exact norm vector
            if len(emb) < 1536:
                padded = np.zeros(1536, dtype=np.float32)
                padded[:len(emb)] = emb
                norm = np.linalg.norm(padded)
                if norm > 0:
                    padded = padded / norm
                return padded.tolist()
            return emb.tolist()
        except Exception as e:
            logger.warning(f"SentenceTransformer encoding failed: {e}")

    # 2. OpenAI Embedding API fallback (if key configured)
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip() and not settings.OPENAI_API_KEY.startswith("your_"):
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            res = client.embeddings.create(
                input=text,
                model=settings.EMBEDDING_MODEL
            )
            return res.data[0].embedding
        except Exception as e:
            logger.warning(f"OpenAI embedding API failed ({e}). Using deterministic feature vector.")

    if not settings.ALLOW_DETERMINISTIC_EMBEDDINGS:
        raise EmbeddingGenerationError(
            "No semantic embedding provider is available. Configure a cached "
            "SentenceTransformer model or a working OpenAI embedding API key."
        )

    # 3. Explicit development-only deterministic fallback. Never enable this in
    # a source-grounded deployment: it is lexical, not semantic.
    logger.warning("Using deterministic development embedding fallback; retrieval quality is degraded.")
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
    all_words = text.lower().split()
    words = [w.strip(",.()[]:;\"'") for w in all_words if w.lower() not in ENGLISH_STOP_WORDS and len(w) > 1]
    if not words:
        words = all_words

    vector = np.zeros(1536, dtype=np.float32)
    for w in words:
        idx = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16) % 1536
        vector[idx] += 1.0
    
    # Add bigrams for context capture
    for i in range(len(words) - 1):
        bigram = f"{words[i]}_{words[i+1]}"
        idx = int(hashlib.md5(bigram.encode('utf-8')).hexdigest(), 16) % 1536
        vector[idx] += 0.5

    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm
    return vector.tolist()

def generate_batch_embeddings(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []

    st_model = get_sentence_transformer_model()
    if st_model is not None:
        try:
            embs = st_model.encode(texts, batch_size=64, convert_to_numpy=True, show_progress_bar=False)
            res = []
            for emb in embs:
                if len(emb) < 1536:
                    padded = np.zeros(1536, dtype=np.float32)
                    padded[:len(emb)] = emb
                    norm = np.linalg.norm(padded)
                    if norm > 0:
                        padded = padded / norm
                    res.append(padded.tolist())
                else:
                    res.append(emb.tolist())
            return res
        except Exception as e:
            logger.warning(f"Batch SentenceTransformer encoding failed: {e}. Falling back to sequential.")

    return [generate_embedding(t) for t in texts]
