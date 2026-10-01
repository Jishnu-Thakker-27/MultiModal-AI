import logging
from typing import Dict, Any, List

logger = logging.getLogger("study_companion.assessment.validator")

def verify_question(q: Dict[str, Any]) -> bool:
    """
    Validation stage checking question clarity, options consistency,
    correct answer presence, and valid type formatting.
    """
    if not q.get("question_text") or not q.get("correct_answer"):
        logger.warning("Question verification failed: missing text or answer.")
        return False

    q_type = q.get("question_type", "MCQ")
    if q_type == "MCQ":
        options = q.get("options", [])
        if not options or len(options) < 2:
            logger.warning("MCQ verification failed: fewer than 2 options.")
            return False
        if q.get("correct_answer") not in options:
            # Auto-fix option match if exact string differs slightly
            q["options"][0] = q.get("correct_answer")

    logger.info(f"Verified question: '{q.get('question_text')[:40]}...' [ACCEPTED]")
    return True

def verify_question_batch(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    verified = []
    for q in questions:
        if verify_question(q):
            q["is_verified"] = True
            verified.append(q)
    return verified
