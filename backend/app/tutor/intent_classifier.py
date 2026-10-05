import re
from typing import Dict, Any
from app.tutor.target_resolver import is_document_overview_query

def classify_learning_intent(query: str) -> Dict[str, Any]:
    """
    Classifies student learning intent to determine optimal retrieval and synthesis strategy.
    """
    q_clean = query.strip().lower()

    if is_document_overview_query(q_clean):
        return {
            "intent": "OVERVIEW",
            "is_foundational": True,
            "suppress_cover": False,
            "query_scope": "BROAD"
        }

    # Determine intent result dictionary
    if re.search(r'\b(cover page|document title|course code|syllabus|table of contents|first page|metadata|what document is this)\b', q_clean):
        res = {"intent": "METADATA_SYLLABUS", "is_foundational": False, "suppress_cover": False}
    elif re.search(r'\bpage\s*(\d+)\b', q_clean):
        page_match = re.search(r'\bpage\s*(\d+)\b', q_clean)
        target_page = int(page_match.group(1))
        res = {"intent": "PAGE_SPECIFIC", "target_page": target_page, "is_foundational": False, "suppress_cover": False if target_page == 1 else True}
    elif re.search(r'\b(graph|diagram|chart|plot|figure|flowchart|illustration|table|image)\b', q_clean):
        res = {"intent": "VISUAL_DIAGRAM", "is_foundational": False, "suppress_cover": True}
    elif re.search(r'\b(summarize|summary|overview|recap|main topics|key concepts)\b', q_clean):
        res = {"intent": "DOCUMENT_SUMMARY", "is_foundational": False, "suppress_cover": True}
    elif re.search(r'\b(quiz|test|practice|assessment|question|exam)\b', q_clean):
        res = {"intent": "QUIZ", "is_foundational": False, "suppress_cover": True}
    elif re.search(r'\b(convert|solve|evaluate|calculate|trace|formula for|equation for)\b', q_clean):
        res = {"intent": "SOLVE_PROBLEM", "is_foundational": False, "suppress_cover": True}
    elif re.search(r'^(what is|define|definition of|meaning of)\b', q_clean):
        res = {"intent": "DEFINITION", "is_foundational": True, "suppress_cover": True}
    elif re.search(r'\b(explain|teach|introduction|basics|start from scratch|overview)\b', q_clean):
        res = {"intent": "LEARN_CONCEPT", "is_foundational": True, "suppress_cover": True}
    elif re.search(r'\b(example|sample|illustration)\b', q_clean):
        res = {"intent": "EXAMPLE", "is_foundational": False, "suppress_cover": True}
    elif len(q_clean.split()) <= 4:
        res = {"intent": "FOLLOW_UP", "is_foundational": False, "suppress_cover": True}
    else:
        res = {"intent": "EXPLAIN_CONCEPT", "is_foundational": False, "suppress_cover": True}

    # Determine explicit query scope for multi-section sampling
    scope = "FOCUSED"
    if re.search(r'\b(compare|difference between|versus|vs\.?|how does .* differ from|comparison)\b', q_clean):
        scope = "COMPARISON"
    elif re.search(r'\b(formula|equation|mathematical expression|derivation|formula for|equation for)\b', q_clean):
        scope = "FORMULA"
    elif re.search(r'\b(example|sample|illustration|ex\.?\s*\d+|exercise)\b', q_clean):
        scope = "EXAMPLE"
    elif re.search(r'\b(graph|diagram|chart|plot|figure|flowchart|illustration|table|image)\b', q_clean):
        scope = "VISUAL"
    elif any(kw in q_clean for kw in ["overview", "summary", "chapter", "unit", "all methods", "general explanation"]) or (
        any(verb in q_clean for verb in ["explain", "teach", "tell me about", "what is", "introduction to"]) and
        not any(sub in q_clean for sub in ["trapezoidal", "simpson", "forward difference", "backward difference", "divided difference", "bisection", "newton-raphson", "secant", "runge-kutta", "lagrange"])
    ):
        scope = "BROAD"

    res["query_scope"] = scope
    return res


