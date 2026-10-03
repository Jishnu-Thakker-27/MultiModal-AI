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
    conversation_id: Optional[str] = None,
    course_id: Optional[str] = None,
    intent: str = "LEARN_CONCEPT",
    target_concept: Optional[ConceptGraphNode] = None,
    prerequisite_nodes: Optional[List[ConceptGraphNode]] = None,
    is_introductory: bool = True,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Hierarchical Multi-Signal RAG Retriever.
    Combines:
    1. Vector Semantic Similarity
    2. Concept Taxonomy Matching (Definition vs Operation vs Application)
    3. Prerequisite Relationship Alignment
    4. Document Sequence Ordering (Early page/slide preference for intro queries)
    5. Active Conversation Scope Filtering
    """
    repo = Repository(db)
    query_vector = generate_embedding(query)

    # 1. Scope restriction by conversation document IDs
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

    prereq_ids = set([p.id for p in (prerequisite_nodes or [])])
    target_id = target_concept.id if target_concept else None

    scored_chunks = []
    for c in chunks:
        # Base Vector Similarity Score
        if c.embedding:
            sim = cosine_similarity(query_vector, c.embedding)
        else:
            sim = 0.5 if any(w in c.content.lower() for w in query.lower().split() if len(w) > 3) else 0.0

        if sim < SIMILARITY_THRESHOLD and intent not in ["LEARN_CONCEPT", "DEFINITION"]:
            continue

        # Concept Type Multiplier
        type_weight = 1.0
        doc_order_weight = 1.0

        # Fetch associated document details
        doc = db.query(Document).filter(Document.id == c.document_id).first()
        doc_title = doc.title if doc else "Course Document"
        page_no = c.page_number or c.slide_number or 1

        # HEURISTIC 1: For Introductory / LEARN_CONCEPT queries:
        # Give higher weight to early document pages (definition & foundations first!)
        if is_introductory:
            # Penalize chunks appearing late in document (e.g. Page > 10 in intro queries)
            if page_no <= 5:
                doc_order_weight = 1.5
            elif page_no <= 10:
                doc_order_weight = 1.1
            else:
                doc_order_weight = 0.6  # Suppress late application pages (e.g. Infix to Postfix on Page 15)

            # Boost foundational terms in content
            content_lower = c.content.lower()
            if any(term in content_lower for term in ["is a", "defined as", "linear list", "lifo", "top pointer", "push", "pop"]):
                type_weight *= 1.4

            # Suppress heavy algorithm application keywords during introductory questions
            if any(term in content_lower for term in ["infix to postfix", "expression conversion", "evaluation of postfix"]):
                type_weight *= 0.4

        # HEURISTIC 2: Prerequisite & Target Node Alignment
        if c.concept_node_id:
            if c.concept_node_id == target_id:
                type_weight *= 1.3
            elif c.concept_node_id in prereq_ids:
                type_weight *= 1.2

        # Final Multi-Signal Score calculation
        final_score = sim * type_weight * doc_order_weight

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
            "similarity_score": sim,
            "final_score": final_score
        })

    # Sort descending by final multi-signal score
    scored_chunks.sort(key=lambda x: x["final_score"], reverse=True)
    
    # If introductory query, enforce ordering by page number among top candidates to preserve teaching sequence
    top_candidates = scored_chunks[:top_k]
    if is_introductory and len(top_candidates) > 1:
        top_candidates.sort(key=lambda x: (x.get("page_number") or x.get("slide_number") or 999))

    logger.info(f"Hierarchical RAG retrieved {len(top_candidates)} grounded chunks for intent '{intent}'")
    return top_candidates
