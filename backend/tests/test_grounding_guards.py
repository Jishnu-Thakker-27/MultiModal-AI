from app.rag.generator import generate_grounded_answer
from app.tutor.intent_classifier import classify_learning_intent


def test_uploaded_document_overview_uses_overview_intent():
    intent = classify_learning_intent(
        "Provide an overview of the main topics and key concepts in this uploaded document."
    )
    assert intent["intent"] == "OVERVIEW"
    assert intent["query_scope"] == "BROAD"


def test_missing_target_refuses_even_when_retriever_returns_generic_context():
    answer, citations, is_grounded = generate_grounded_answer(
        "Explain quantum chromodynamics",
        [{"content": "A worked bisection-method example.", "final_score": 99.0}],
        {"target_name": "quantum chromodynamics", "coverage_state": "STATE_A_NOT_FOUND"},
    )

    assert is_grounded is False
    assert citations == []
    assert "not covered" in answer.lower()
