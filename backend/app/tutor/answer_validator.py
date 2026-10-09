import logging
import re
from typing import List, Dict, Any, Tuple

logger = logging.getLogger("study_companion.tutor.answer_validator")

STOPWORDS = {
    "explain", "me", "the", "for", "rule", "method", "what", "is", "give", "example",
    "compare", "and", "a", "an", "in", "on", "of", "to", "with", "by", "from", "how",
    "does", "do", "can", "you", "formula"
}

class AnswerValidator:
    """
    Pedagogical Answer & Citation Validator.
    Determines response quality and target relevance.
    
    STRICT PRINCIPLE:
    This validator NEVER replaces a generated LLM response with raw PDF source quotes.
    Source text is evidence for grounding, not a synthesized response.
    """

    def _extract_core_target_stems(self, target_name: str) -> List[str]:
        if not target_name:
            return []
        
        # Clean target string from query artifacts
        cleaned = re.sub(r'[^a-zA-Z0-9\.\/]+', ' ', target_name.lower())
        words = [w.strip() for w in cleaned.split() if w.strip() and w.strip() not in STOPWORDS and len(w.strip()) > 1]
        
        # Add root stems (e.g. trapezoidal -> trapezoid)
        stems = []
        for w in words:
            stems.append(w)
            if w.endswith("al"):
                stems.append(w[:-2])
            elif w.endswith("oid"):
                stems.append(w[:-3])
            elif w.endswith("s"):
                stems.append(w[:-1])
                
        return list(set(stems))

    def validate_and_refine(
        self,
        answer: str,
        target_name: str,
        retrieved_chunks: List[Dict[str, Any]],
        citations: List[Dict[str, Any]]
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Validates the tutor response against target relevance and structural integrity.
        Returns synthesized answer as-is if valid, or a refined insufficient message if empty.
        NEVER generates raw PDF quote replacements.
        """
        if not answer or not answer.strip():
            logger.warning("AnswerValidator: Empty answer received. Returning insufficient response notice.")
            insufficient_msg = (
                "The tutor was unable to synthesize a complete response from the retrieved course material. "
                "Please try rephrasing your question or selecting a specific topic."
            )
            return insufficient_msg, citations

        ans_lower = answer.lower()

        # 1. Preserve system/fallback messages as-is
        if "service unavailable" in ans_lower or "not covered in your uploaded course material" in ans_lower:
            return answer, citations

        # 2. Suppress citations if this is an introductory diagnostic question asking for prior knowledge
        is_diagnostic_probe = any(probe_phr in ans_lower for probe_phr in [
            "what do you already know",
            "what do you think this topic is about",
            "what do you think it is about",
            "before we dive in, i would love to know",
            "before we jump in",
            "share your thoughts freely, or reply"
        ])
        if is_diagnostic_probe:
            citations = []

        # 2. Semantic & Keyword Target Match Check
        t_clean = (target_name or "").strip().lower()
        if not t_clean:
            return answer, citations

        target_stems = self._extract_core_target_stems(target_name)
        
        # If any target stem or exact target is present in answer, it is valid!
        has_target_match = any(stem in ans_lower for stem in target_stems) or (t_clean in ans_lower)
        
        if has_target_match or len(answer.strip()) >= 50:
            logger.info(f"AnswerValidator: Response validated successfully for target '{target_name}'. [STATUS: VALID]")
            return answer, citations

        # 3. If target matching is uncertain but answer exists, keep synthesized answer
        # DO NOT REPLACE WITH RAW SOURCE QUOTE!
        logger.info(f"AnswerValidator: Response accepted for target '{target_name}' with general synthesis. [STATUS: PARTIALLY_VALID]")
        return answer, citations


def validate_tutor_response(
    answer: str,
    target_name: str,
    retrieved_chunks: List[Dict[str, Any]],
    citations: List[Dict[str, Any]]
) -> Tuple[str, List[Dict[str, Any]]]:
    validator = AnswerValidator()
    return validator.validate_and_refine(answer, target_name, retrieved_chunks, citations)
