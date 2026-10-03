import re
from typing import Dict, Any

def classify_learning_intent(query: str) -> Dict[str, Any]:
    """
    Classifies student learning intent to determine optimal pedagogical strategy.
    
    Supported Intents:
    - LEARN_CONCEPT: Introductory request for a concept (e.g. "Explain me stack", "Teach me AVL trees")
    - DEFINITION: Direct definition lookup (e.g. "What is TOP?", "Define LIFO")
    - PROCEDURE: Step-by-step operation details (e.g. "How does PUSH work?", "Explain POP algorithm")
    - WHY_QUESTION: Conceptual reasoning inquiry (e.g. "Why does TOP start at -1?")
    - SOLVE_PROBLEM: Problem solving or conversion request (e.g. "Convert A+B to postfix")
    - EXAMPLE: Request for illustrative example
    - QUIZ: Request for practice assessment
    - FOLLOW_UP: Short follow-up question in conversation context
    """
    q_clean = query.strip().lower()

    # Quiz / Practice request
    if re.search(r'\b(quiz|test|practice|assessment|question|exam)\b', q_clean):
        return {"intent": "QUIZ", "is_foundational": False, "requires_prerequisites": False}

    # Problem solving / Exercise
    if re.search(r'\b(convert|solve|evaluate|calculate|trace|infix to postfix)\b', q_clean):
        return {"intent": "SOLVE_PROBLEM", "is_foundational": False, "requires_prerequisites": True}

    # Definition lookup
    if re.search(r'^(what is|define|definition of|meaning of)\b', q_clean):
        return {"intent": "DEFINITION", "is_foundational": True, "requires_prerequisites": False}

    # Why / Reasoning inquiry
    if re.search(r'\b(why|reason|how come)\b', q_clean):
        return {"intent": "WHY_QUESTION", "is_foundational": False, "requires_prerequisites": True}

    # Procedure / Operation explanation
    if re.search(r'^(how does|explain how|procedure|steps|algorithm|pop|push|peek)\b', q_clean):
        return {"intent": "PROCEDURE", "is_foundational": False, "requires_prerequisites": True}

    # Introductory Concept Request ("Explain me stack", "Teach me stack")
    if re.search(r'\b(explain me|explain|teach me|introduction|basics|start from scratch|overview)\b', q_clean):
        return {"intent": "LEARN_CONCEPT", "is_foundational": True, "requires_prerequisites": True}

    # Example request
    if re.search(r'\b(example|sample|illustration)\b', q_clean):
        return {"intent": "EXAMPLE", "is_foundational": False, "requires_prerequisites": False}

    # Short follow-up query default
    if len(q_clean.split()) <= 4:
        return {"intent": "FOLLOW_UP", "is_foundational": False, "requires_prerequisites": False}

    return {"intent": "EXPLAIN_CONCEPT", "is_foundational": False, "requires_prerequisites": True}
