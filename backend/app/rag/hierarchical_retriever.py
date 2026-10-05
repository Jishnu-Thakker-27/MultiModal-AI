import os
import logging
import re
import numpy as np
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database.models import DocumentChunk, Document, ConceptGraphNode
from app.database.repositories import Repository
from app.rag.embeddings import generate_embedding
from app.rag.retriever import cosine_similarity, SIMILARITY_THRESHOLD
from app.tutor.target_resolver import generate_concept_aliases

logger = logging.getLogger("study_companion.rag.hierarchical_retriever")

def calculate_lexical_score(query_terms: List[str], text: str) -> float:
    """
    Calculates BM25-style lexical keyword and sub-term match score.
    """
    text_lower = text.lower()
    score = 0.0
    for term in query_terms:
        if not term or len(term) <= 2:
            continue
        term_clean = term.lower()
        if term_clean in text_lower:
            count = text_lower.count(term_clean)
            score += min(count * 0.5, 2.0)
    return score

def retrieve_hierarchical_chunks(
    db: Session,
    query: str,
    target_name: str,
    conversation_id: Optional[str] = None,
    course_id: Optional[str] = None,
    intent: str = "LEARN_CONCEPT",
    query_scope: str = "FOCUSED",
    target_concept: Optional[ConceptGraphNode] = None,
    prerequisite_nodes: Optional[List[ConceptGraphNode]] = None,
    is_introductory: bool = True,
    target_page: Optional[int] = None,
    top_k: int = 5,
    user_id: Optional[str] = "demo_student",
    learner_profile: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Memory-Aware Hybrid Multimodal Graph RAG Retriever.
    Combines:
    - Dense vector similarity (SentenceTransformers)
    - Lexical keyword matching (BM25-style with concept root & alias normalization)
    - Knowledge Graph neighborhood expansion (1-hop prerequisites, parent containers, related nodes)
    - Learner Memory biasing (reinforcing student weak topics & addressing misconceptions)
    - Multimodal artifact awareness (images, formulas, slides, videos)
    - Section-level diversity sampling & neighboring chunk ($N+1$) context expansion.
    """
    repo = Repository(db)
    query_vector = generate_embedding(query)

    # Scope restriction by conversation or course document IDs
    if conversation_id:
        allowed_doc_ids = repo.get_conversation_document_ids(conversation_id)
        if not allowed_doc_ids:
            logger.info(f"No documents attached to conversation_id: {conversation_id}")
            return []
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(allowed_doc_ids)).order_by(DocumentChunk.chunk_index).all()
    elif course_id:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.course_id == course_id).order_by(DocumentChunk.chunk_index).all()
    else:
        chunks = db.query(DocumentChunk).order_by(DocumentChunk.chunk_index).all()

    if not chunks:
        return []

    # Diagnostic Indexing Log
    indexed_pages = sorted(list(set([c.page_number for c in chunks if c.page_number])))
    logger.info(f"Hybrid Retriever searching across {len(chunks)} chunks across pages {indexed_pages[:5]}...{indexed_pages[-3:] if len(indexed_pages)>5 else ''} (Scope: {query_scope})")

    target_clean = (target_name or "").strip().lower()
    target_root = re.sub(r'\b(method|formula|technique|procedure|algorithm|operator|theorem|rule|equation)\b', '', target_clean, flags=re.I).strip()

    target_aliases = set(generate_concept_aliases(target_clean))
    if target_root:
        target_aliases.update(generate_concept_aliases(target_root))

    # Add core search terms from query and target
    search_terms = list(set([t for t in (target_clean + " " + target_root + " " + query.lower()).split() if len(t) > 2]))

    prereq_names = set([p.name.lower() for p in (prerequisite_nodes or [])])
    # Knowledge Graph Neighborhood Lookup (1-hop traversal)
    graph_connected_chunk_ids = set()
    graph_prereq_chunk_ids = set()
    graph_parent_chunk_ids = set()
    if target_concept:
        from app.knowledge.graph_manager import GraphManager
        gm = GraphManager(db)
        neighborhood = gm.get_related_graph_neighborhood(target_concept.id, max_hops=1)
        graph_connected_chunk_ids = set(neighborhood.get("connected_chunk_ids", []))
        for p in neighborhood.get("prerequisites", []):
            prereq_names.add(p.name.lower())
        for prt in neighborhood.get("parents", []):
            prereq_names.add(prt.name.lower())

    # Learner Memory State Extraction
    if not learner_profile and user_id:
        learner_profile = repo.get_learner_profile(user_id=user_id, course_id=course_id)
    
    weak_topic_names = set([w["topic_name"].lower() for w in (learner_profile.get("weak_topics", []) if learner_profile else [])])
    active_misconceptions = [m["text"].lower() for m in (learner_profile.get("active_misconceptions", []) if learner_profile else [])]

    # Detect if query explicitly asks about cover page/syllabus/metadata
    q_lower = query.lower()
    is_metadata_query = intent == "METADATA_SYLLABUS" or any(kw in q_lower for kw in ["cover page", "syllabus", "course code", "document title", "metadata", "first page"])

    chunk_map = {c.chunk_index: c for c in chunks}
    scored_chunks = []

    for c in chunks:
        content_lower = c.content.lower()
        content_norm = re.sub(r'[-_]', ' ', content_lower)
        p_start = c.page_number or 1
        p_end = c.page_end or p_start

        # 1. Vector Similarity Score
        if c.embedding:
            sim = cosine_similarity(query_vector, c.embedding)
        else:
            sim = 0.5 if any(alias in content_lower or alias in content_norm for alias in target_aliases) else 0.0

        # 2. Lexical Score (BM25 Keyword Matching)
        lex_score = calculate_lexical_score(search_terms, c.content)

        relevance_category = "SUPPORTING_CONTEXT"
        retrieval_reason = "general_context"
        target_multiplier = 1.0
        definition_boost = 1.0
        content_quality_boost = 1.0
        cover_demotion = 1.0
        scope_boost = 1.0

        # 3. Cover Page / Metadata Suppression (Query-Aware)
        is_cover_chunk = (c.page_type == "COVER_METADATA" or p_start == 1) and not is_metadata_query and intent not in ["OVERVIEW", "SUMMARY"]
        if p_start == 1 and not is_metadata_query and intent not in ["OVERVIEW", "SUMMARY"]:
            if any(sym in content_lower for sym in ["unit-", "course code", "credits", "department of", "statistics and numerical"]):
                if not any(body_kw in content_lower for body_kw in ["is defined as", "process of finding", "least squares", "forward difference"]):
                    is_cover_chunk = True

        if is_cover_chunk:
            cover_demotion = 0.15  # Strongly demote cover metadata for content queries
            retrieval_reason = "cover_demoted"

        # 4. Exact Page Range Matching (for PAGE_SPECIFIC intent, e.g. "page 27")
        page_boost = 1.0
        page_match_score = 0.0
        if target_page and (p_start <= target_page <= p_end or p_start == target_page):
            page_boost = 5.0
            page_match_score = 2.0
            relevance_category = "EXACT_PAGE_TARGET"
            retrieval_reason = "exact_page_target"

        # 5. Target & Knowledge Graph Match Evaluation
        target_node_id = target_concept.id if target_concept else None
        is_target_match = False
        is_graph_neighborhood_match = c.id in graph_connected_chunk_ids
        
        if target_node_id and c.concept_node_id == target_node_id:
            is_target_match = True
        elif any(alias in content_lower or alias in content_norm for alias in target_aliases):
            is_target_match = True

        graph_boost = 1.0
        if is_graph_neighborhood_match and not is_target_match:
            graph_boost = 1.6
            relevance_category = "GRAPH_NEIGHBORHOOD"
            retrieval_reason = "graph_neighborhood_relation"

        # 6. Learner Memory Scoring (Weak Topic Reinforcement & Misconceptions)
        memory_boost = 1.0
        is_weak_topic_match = any(wt in content_lower for wt in weak_topic_names)
        is_misconception_related = any(misc in content_lower for misc in active_misconceptions)
        
        if is_weak_topic_match:
            memory_boost += 0.35
            if relevance_category == "SUPPORTING_CONTEXT":
                relevance_category = "LEARNER_WEAK_TOPIC"
                retrieval_reason = "learner_weak_topic_support"

        if is_misconception_related:
            memory_boost += 0.45
            relevance_category = "MISCONCEPTION_REMEDIATION"
            retrieval_reason = "misconception_remediation"

        if is_target_match and not is_cover_chunk:
            relevance_category = "PRIMARY_TARGET"
            retrieval_reason = "target_concept_match"
            target_multiplier = 3.5

            if any(def_kw in content_lower for def_kw in ["is a", "defined as", "process of", "operator", "forward difference", "divided difference", "least squares"]):
                definition_boost = 2.0
                retrieval_reason = "definition_match"
        elif any(p_name in content_lower for p_name in prereq_names):
            if relevance_category not in ["MISCONCEPTION_REMEDIATION", "LEARNER_WEAK_TOPIC"]:
                relevance_category = "PREREQUISITE"
                retrieval_reason = "prerequisite_context"
            target_multiplier = 1.5

        # 7. Scope-Specific Multipliers (FORMULA, VISUAL, EXAMPLE)
        if query_scope == "FORMULA":
            if any(f_kw in content_lower for f_kw in ["=", "∫", "\\int", "dx", "formula", "equation", "h/2", "h/3", "3h/8"]):
                scope_boost = 2.0
                retrieval_reason = "formula_match"
        elif query_scope == "VISUAL":
            if c.page_type in ["IMAGE", "FIGURE", "VISUAL_MATHEMATICAL"] or c.visual_image_path or any(v_kw in content_lower for v_kw in ["graph", "diagram", "figure", "plot"]):
                scope_boost = 2.5
                retrieval_reason = "visual_evidence"
        elif query_scope == "EXAMPLE":
            if any(ex_kw in content_lower for ex_kw in ["example", "ex.", "illustration", "problem", "solution"]):
                scope_boost = 2.0
                retrieval_reason = "example_match"

        # 8. Substantive Body Content Quality Boost
        if len(content_lower.split()) > 15 and not is_cover_chunk:
            content_quality_boost = 1.4

        base_score = sim + lex_score + (0.5 if is_target_match else 0.0) + (0.4 if is_graph_neighborhood_match else 0.0) + page_match_score
        final_score = base_score * target_multiplier * definition_boost * graph_boost * memory_boost * content_quality_boost * cover_demotion * page_boost * scope_boost

        doc = db.query(Document).filter(Document.id == c.document_id).first()
        doc_title = doc.title if doc else "Course Document"

        file_url = ""
        if doc and doc.file_path:
            import os
            cid = c.course_id or "default"
            file_url = f"/uploads/{cid}/{os.path.basename(doc.file_path)}"

        scored_chunks.append({
            "chunk_index": c.chunk_index,
            "chunk_id": c.id,
            "document_id": c.document_id,
            "document_title": doc_title,
            "source_type": c.source_type,
            "file_url": file_url,
            "content": c.content,
            "page_number": p_start,
            "page_end": p_end,
            "heading": c.heading or f"Page {p_start}",
            "section": c.section or f"Section Page {p_start}",
            "page_type": c.page_type or "TEXT",
            "visual_image_path": getattr(c, "visual_image_path", None),
            "formula_latex": getattr(c, "formula_latex", None),
            "slide_number": c.slide_number,
            "start_time": c.start_time,
            "end_time": c.end_time,
            "is_graph_hit": is_graph_neighborhood_match,
            "is_weak_topic_hit": is_weak_topic_match,
            "is_misconception_hit": is_misconception_related,
            "relevance_category": relevance_category,
            "retrieval_reason": retrieval_reason,
            "similarity_score": sim,
            "lexical_score": lex_score,
            "final_score": final_score
        })

    # Sort descending by final score
    scored_chunks.sort(key=lambda x: x["final_score"], reverse=True)
    
    top_candidates = []
    seen_sections = set()
    
    # 8. Scope-Based Candidate Sampling (BROAD, COMPARISON, FOCUSED)
    if query_scope == "BROAD" or intent in ["SUMMARY", "OVERVIEW"]:
        logger.info("Retriever: Executing BROAD scope multi-section sampling across chapter topics...")
        broad_k = max(top_k, 7)
        # For BROAD scope: pick highest-scoring chunk from EACH distinct section/subsection across document
        for c in scored_chunks:
            if c.get("page_type") == "COVER_METADATA" or (c.get("page_number") == 1 and c["final_score"] < 0.5 and intent not in ["SUMMARY", "OVERVIEW"]):
                continue
            sec = (c.get("section") or f"Page_{c['page_number']}").strip()
            if sec not in seen_sections and c["final_score"] > 0.05:
                seen_sections.add(sec)
                top_candidates.append(c)
                if len(top_candidates) >= broad_k:
                    break
    elif query_scope == "COMPARISON":
        logger.info("Retriever: Executing COMPARISON scope multi-target sampling...")
        # Identify comparison targets in query
        terms = [t for t in search_terms if t not in ["compare", "comparison", "versus", "difference", "between"]]
        added_targets = set()
        for c in scored_chunks:
            if c.get("page_type") == "COVER_METADATA":
                continue
            content_lower = c["content"].lower()
            matched_term = next((t for t in terms if t in content_lower), None)
            if matched_term and matched_term not in added_targets:
                added_targets.add(matched_term)
                top_candidates.append(c)
            elif len(top_candidates) < top_k and c not in top_candidates and c["final_score"] > 0.1:
                top_candidates.append(c)
            if len(top_candidates) >= top_k:
                break
    else:
        # FOCUSED default sampling: Top 1 + Top candidate per distinct substantive section
        if scored_chunks:
            top_1 = scored_chunks[0]
            top_candidates.append(top_1)
            sec_1 = (top_1.get("section") or "").strip()
            if sec_1:
                seen_sections.add(sec_1)

        for c in scored_chunks[1:]:
            if c.get("page_type") == "COVER_METADATA" or c.get("page_number") == 1:
                continue
            sec = (c.get("section") or "").strip()
            if sec and sec not in seen_sections and c["final_score"] > 0.1:
                seen_sections.add(sec)
                top_candidates.append(c)
                if len(top_candidates) >= top_k:
                    break

    # Fallback to fill remaining top_k slots if needed
    if len(top_candidates) < top_k:
        for c in scored_chunks:
            if c not in top_candidates and c.get("page_type") != "COVER_METADATA":
                top_candidates.append(c)
                if len(top_candidates) >= top_k:
                    break

    # 9. Neighboring Chunk Context Expansion (Pull adjacent N+1 chunk)
    expanded_chunks = []
    seen_indices = set()

    for cand in top_candidates:
        c_idx = cand["chunk_index"]
        # Include candidate
        if c_idx not in seen_indices:
            seen_indices.add(c_idx)
            expanded_chunks.append(cand)

        # Pull next chunk if from same section/page neighborhood
        next_cand = chunk_map.get(c_idx + 1)
        if next_cand and (c_idx + 1) not in seen_indices:
            if next_cand.document_id == cand["document_id"] and abs((next_cand.page_number or 1) - cand["page_number"]) <= 1:
                seen_indices.add(c_idx + 1)
                expanded_chunks.append({
                    "chunk_index": next_cand.chunk_index,
                    "chunk_id": next_cand.id,
                    "document_id": next_cand.document_id,
                    "document_title": cand["document_title"],
                    "source_type": next_cand.source_type,
                    "file_url": cand["file_url"],
                    "content": next_cand.content,
                    "page_number": next_cand.page_number or cand["page_number"],
                    "page_end": next_cand.page_end or next_cand.page_number or cand["page_number"],
                    "heading": next_cand.heading or cand["heading"],
                    "section": next_cand.section or cand["section"],
                    "page_type": next_cand.page_type or "TEXT",
                    "visual_image_path": getattr(next_cand, "visual_image_path", None),
                    "formula_latex": getattr(next_cand, "formula_latex", None),
                    "slide_number": next_cand.slide_number,
                    "start_time": next_cand.start_time,
                    "end_time": next_cand.end_time,
                    "is_graph_hit": cand.get("is_graph_hit", False),
                    "is_weak_topic_hit": cand.get("is_weak_topic_hit", False),
                    "is_misconception_hit": cand.get("is_misconception_hit", False),
                    "relevance_category": "NEIGHBORING_CONTEXT",
                    "retrieval_reason": "neighbor_context",
                    "similarity_score": cand["similarity_score"],
                    "lexical_score": cand["lexical_score"],
                    "final_score": cand["final_score"] * 0.9
                })

    logger.info(f"Hybrid RAG retrieved {len(expanded_chunks)} expanded chunks for query '{query}' (Target: '{target_name}', Scope: '{query_scope}')")
    for idx, ec in enumerate(expanded_chunks[:3], 1):
        logger.info(f"  Result #{idx}: Page {ec['page_number']} (Score: {ec['final_score']:.2f}, Section: '{ec['section']}') -> Excerpt: '{ec['content'][:60]}...'")

    return expanded_chunks


def retrieve_document_summary_chunks(
    db: Session,
    conversation_id: Optional[str] = None,
    course_id: Optional[str] = None,
    top_k: int = 8,
) -> List[Dict[str, Any]]:
    """Return representative, source-distributed evidence for a document overview.

    A summary is not a missing concept.  Selecting one substantive chunk from
    successive pages/sections avoids the old behaviour of ranking arbitrary
    worked examples merely because the query contains generic words.
    """
    repo = Repository(db)
    if conversation_id:
        document_ids = repo.get_conversation_document_ids(conversation_id)
        if not document_ids:
            return []
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(document_ids)).order_by(
            DocumentChunk.document_id, DocumentChunk.page_number, DocumentChunk.chunk_index
        ).all()
    elif course_id:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.course_id == course_id).order_by(
            DocumentChunk.document_id, DocumentChunk.page_number, DocumentChunk.chunk_index
        ).all()
    else:
        return []

    documents = {d.id: d for d in db.query(Document).filter(Document.id.in_({c.document_id for c in chunks})).all()}
    representatives = []
    seen_locations = set()
    for c in chunks:
        if not c.content or len(c.content.split()) < 12 or c.page_type == "COVER_METADATA":
            continue
        location = (c.document_id, c.page_number or c.slide_number or c.start_time, c.section or "")
        if location in seen_locations:
            continue
        seen_locations.add(location)
        doc = documents.get(c.document_id)
        cid = c.course_id or "default"
        representatives.append({
            "chunk_index": c.chunk_index,
            "chunk_id": c.id,
            "document_id": c.document_id,
            "document_title": doc.title if doc else "Course Document",
            "source_type": c.source_type,
            "file_url": f"/uploads/{cid}/{os.path.basename(doc.file_path)}" if doc and doc.file_path else "",
            "content": c.content,
            "page_number": c.page_number,
            "page_end": c.page_end or c.page_number,
            "heading": c.heading or f"Page {c.page_number}",
            "section": c.section or "Document overview",
            "page_type": c.page_type or "TEXT",
            "slide_number": c.slide_number,
            "start_time": c.start_time,
            "end_time": c.end_time,
            "relevance_category": "DOCUMENT_OVERVIEW",
            "retrieval_reason": "distributed_document_summary",
            "similarity_score": 1.0,
            "lexical_score": 1.0,
            "final_score": 1.0,
        })

    if len(representatives) <= top_k:
        return representatives
    # Preserve coverage across the full document instead of taking only its start.
    positions = [round(i * (len(representatives) - 1) / (top_k - 1)) for i in range(top_k)]
    return [representatives[i] for i in dict.fromkeys(positions)]

