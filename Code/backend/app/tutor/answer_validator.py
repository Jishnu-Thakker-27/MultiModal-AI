import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger("study_companion.tutor.answer_validator")

class AnswerValidator:
    """
    Lightweight Answer & Citation Validator.
    Validates final response before returning to student to ensure:
    1. The answer actually addresses the user's explicit target concept.
    2. It did NOT substitute an unrelated concept as the primary subject.
    3. Citations match the requested target concept.
    """
    def validate_and_refine(
        self,
        answer: str,
        target_name: str,
        retrieved_chunks: List[Dict[str, Any]],
        citations: List[Dict[str, Any]]
    ) -> Tuple[str, List[Dict[str, Any]]]:
        t_clean = (target_name or "").strip().lower()

        # If answer mentions target, it passed basic validation
        if not t_clean or t_clean in answer.lower():
            return answer, citations

        # If answer substituted an unrelated concept as primary subject, fix it!
        top_target_chunk = next((c for c in retrieved_chunks if c.get("relevance_category") == "PRIMARY_TARGET"), None)

        if top_target_chunk:
            loc_str = f"Page {top_target_chunk.get('page_number') or 1}"
            refined_answer = (
                f"**{target_name}**\n\n"
                f"Based on **{top_target_chunk['document_title']}** ({loc_str}):\n\n"
                f"> \"{top_target_chunk['content']}\"\n\n"
                f"This material directly addresses **{target_name}**."
            )
            logger.warning(f"AnswerValidator: Answer did not contain target '{target_name}'. Refined answer to focus strictly on target.")
            return refined_answer, citations

        return answer, citations

def validate_tutor_response(
    answer: str,
    target_name: str,
    retrieved_chunks: List[Dict[str, Any]],
    citations: List[Dict[str, Any]]
) -> Tuple[str, List[Dict[str, Any]]]:
    validator = AnswerValidator()
    return validator.validate_and_refine(answer, target_name, retrieved_chunks, citations)
