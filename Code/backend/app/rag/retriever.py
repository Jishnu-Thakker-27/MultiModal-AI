import numpy as np
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database.models import DocumentChunk, Document
from app.rag.embeddings import generate_embedding
import logging

logger = logging.getLogger("study_companion.rag.retriever")

SIMILARITY_THRESHOLD = 0.15 # Minimum similarity score to be considered relevant

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    if not vec1 or not vec2:
        return 0.0
    v1 = np.array(vec1, dtype=np.float32)
    v2 = np.array(vec2, dtype=np.float32)
    dot = np.dot(v1, v2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 > 0 and norm2 > 0:
        return float(dot / (norm1 * norm2))
    return 0.0

def retrieve_top_chunks(
    db: Session,
    course_id: str = None,
    query: str = "",
    top_k: int = 5,
    min_similarity: float = SIMILARITY_THRESHOLD,
    conversation_id: str = None
) -> List[Dict[str, Any]]:
    """
    Retrieves top relevant chunks for a user query using vector similarity
    and metadata filtering. Enforces conversation-scoped document filtering
    to prevent cross-conversation context contamination.
    """
    query_vector = generate_embedding(query)
    
    # 1. Conversation-scoped filtering takes priority
    if conversation_id:
        from app.database.repositories import Repository
        repo = Repository(db)
        allowed_doc_ids = repo.get_conversation_document_ids(conversation_id)
        if not allowed_doc_ids:
            logger.info(f"No documents attached to conversation_id: {conversation_id}")
            return []
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(allowed_doc_ids)).all()
    elif course_id:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.course_id == course_id).all()
    else:
        chunks = db.query(DocumentChunk).all()

    if not chunks:
        logger.info(f"No document chunks found for conversation_id={conversation_id}, course_id={course_id}")
        return []

    scored_chunks = []
    for c in chunks:
        if c.embedding:
            sim = cosine_similarity(query_vector, c.embedding)
        else:
            sim = 0.5 if any(w in c.content.lower() for w in query.lower().split() if len(w) > 3) else 0.0

        if sim >= min_similarity:
            doc = db.query(Document).filter(Document.id == c.document_id).first()
            doc_title = doc.title if doc else "Course Document"
            file_url = ""
            if doc and doc.file_path:
                import os
                cid = c.course_id or "default"
                file_url = f"/uploads/{cid}/{os.path.basename(doc.file_path)}"

            scored_chunks.append({
                "chunk_id": c.id,
                "document_title": doc_title,
                "source_type": c.source_type,
                "file_url": file_url,
                "content": c.content,
                "page_number": c.page_number,
                "slide_number": c.slide_number,
                "start_time": c.start_time,
                "end_time": c.end_time,
                "topic": c.topic,
                "subtopic": c.subtopic,
                "concept": c.concept,
                "similarity_score": sim
            })

    # Sort descending by similarity score
    scored_chunks.sort(key=lambda x: x["similarity_score"], reverse=True)
    top_results = scored_chunks[:top_k]

    logger.info(f"Retrieved {len(top_results)} relevant chunks (min_similarity={min_similarity}) for query: '{query}'")
    return top_results
