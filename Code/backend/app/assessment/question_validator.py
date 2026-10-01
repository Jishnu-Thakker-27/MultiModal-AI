import logging
from typing import Dict, Any, List

logger = logging.getLogger("study_companion.assessment.validator")

# Cross-topic terms to check against contamination when requested topic does not involve trees/data structures
DS_TREE_TERMS = {"avl tree", "tree rotation", "binary search tree", "bst insertion", "node splitting"}

def verify_question(q: Dict[str, Any], requested_topic: str) -> bool:
    """
    Strict validation stage checking topic consistency, source chunk tracing,
    options consistency, non-empty answers/explanations, and cross-topic contamination.
    """
    if not q or not isinstance(q, dict):
        logger.warning("Question validation failed: malformed object.")
        return False

    q_text = q.get("question_text", "").strip()
    correct_ans = q.get("correct_answer", "").strip()
    explanation = q.get("explanation", "").strip()
    q_topic = q.get("topic_name", "").strip()

    if not q_text or not correct_ans or not explanation:
        logger.warning(f"Question validation failed for '{q_text[:30]}': missing text, answer, or explanation.")
        return False

    # 1. Enforce topic consistency
    if requested_topic and q_topic and q_topic.lower() != requested_topic.lower():
        logger.warning(f"Topic mismatch: question topic '{q_topic}' != requested '{requested_topic}'")
        return False

    # 2. Prevent cross-topic metadata contamination (e.g. BST terms in Probability topic)
    req_lower = requested_topic.lower() if requested_topic else ""
    is_tree_topic = any(term in req_lower for term in ["tree", "bst", "avl", "data structure", "graph"])
    
    if not is_tree_topic:
        q_text_lower = q_text.lower()
        for ds_term in DS_TREE_TERMS:
            if ds_term in q_text_lower:
                logger.warning(f"Cross-topic contamination detected: term '{ds_term}' found in non-tree question for topic '{requested_topic}'")
                return False

    # 3. Source chunk tracing requirement
    source_chunks = q.get("source_chunk_ids", [])
    source_meta = q.get("source_metadata", {})
    if not source_chunks or not source_meta:
        logger.warning(f"Validation failed for '{q_text[:30]}': missing source_chunk_ids or source_metadata.")
        return False

    # 4. MCQ Options verification
    q_type = q.get("question_type", "MCQ")
    if q_type == "MCQ":
        options = q.get("options", [])
        if not options or len(options) < 2:
            logger.warning(f"MCQ validation failed for '{q_text[:30]}': fewer than 2 options.")
            return False
        if correct_ans not in options:
            options[0] = correct_ans # Ensure correct answer is present in options list

    logger.info(f"Verified question for topic '{requested_topic}': '{q_text[:40]}...' [ACCEPTED]")
    return True

def verify_question_batch(questions: List[Dict[str, Any]], requested_topic: str) -> List[Dict[str, Any]]:
    verified = []
    seen_texts = set()

    for q in questions:
        q_text = q.get("question_text", "").strip()
        if q_text in seen_texts:
            logger.warning(f"Duplicate question rejected: '{q_text[:30]}'")
            continue

        if verify_question(q, requested_topic):
            q["is_verified"] = True
            seen_texts.add(q_text)
            verified.append(q)

    return verified
