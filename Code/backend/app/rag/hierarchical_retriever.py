import logging
import numpy as np
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database.models import DocumentChunk, Document, ConceptGraphNode
from app.database.repositories import Repository
from app.rag.embeddings import generate_embedding
from app.rag.retriever import cosine_similarity, SIMILARITY_THRESHOLD

logger = logging.getLogger("study_companion.rag.hierarchical_retriever")

def retrieve_hierarchical_chunks(
    db: Session,
    query: str,
    target_name: str,
    conversation_id: Optional[str] = None,
    course_id: Optional[str] = None,
    intent: str = "LEARN_CONCEPT",
    target_concept: Optional[ConceptGraphNode] = None,
    prerequisite_nodes: Optional[List[ConceptGraphNode]] = None,
    is_introductory: bool = True,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Target-Centered Hierarchical RAG Retriever.
    Prevents semantic retrieval from substituting an unrelated concept.
    Ranks chunks strictly around:
    1. PRIMARY_TARGET matches (exact/keyword/node match for target_name)
    2. Validated PREREQUISITE matches (only if explicitly required)
    3. Vector Semantic Similarity
    4. Source location metadata (PDF page, PPT slide, Video timestamp)
    """
    repo = Repository(db)
    query_vector = generate_embedding(query)

    # Filter available document scope
    allowed_doc_ids = []
    if conversation_id:
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
        return []

    target_clean = (target_name or "").strip().lower()
    prereq_names = set([p.name.lower() for p in (prerequisite_nodes or [])])
    target_node_id = target_concept.id if target_concept else None

    scored_chunks = []
    for c in chunks:
        content_lower = c.content.lower()

        # Calculate Vector Similarity Score
        if c.embedding:
            sim = cosine_similarity(query_vector, c.embedding)
        else:
            sim = 0.5 if target_clean and target_clean in content_lower else 0.0

        # Target-Centered Relevance Classification & Weighting
        relevance_category = "SUPPORTING_CONTEXT"
        target_multiplier = 1.0

        # Check if chunk explicitly mentions target concept
        is_target_match = False
        if target_node_id and c.concept_node_id == target_node_id:
            is_target_match = True
        elif target_clean and len(target_clean) > 2 and target_clean in content_lower:
            is_target_match = True
        elif target_clean and any(w in content_lower for w in target_clean.split() if len(w) > 3):
            is_target_match = True

        if is_target_match:
            relevance_category = "PRIMARY_TARGET"
            target_multiplier = 3.5  # High priority boost to prevent target replacement!
        elif any(p_name in content_lower for p_name in prereq_names):
            relevance_category = "PREREQUISITE"
            target_multiplier = 1.5
        elif sim < SIMILARITY_THRESHOLD and intent not in ["LEARN_CONCEPT", "DEFINITION"]:
            continue

        # Final Multi-Signal Score
        final_score = (sim + (0.5 if is_target_match else 0.0)) * target_multiplier

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
            "relevance_category": relevance_category,
            "similarity_score": sim,
            "final_score": final_score
        })

    # Sort descending by target-centered final score
    scored_chunks.sort(key=lambda x: x["final_score"], reverse=True)
    top_candidates = scored_chunks[:top_k]

    logger.info(f"Target-Centered RAG retrieved {len(top_candidates)} chunks for target '{target_name}' (Top category: {top_candidates[0]['relevance_category'] if top_candidates else 'None'})")
    return top_candidates
