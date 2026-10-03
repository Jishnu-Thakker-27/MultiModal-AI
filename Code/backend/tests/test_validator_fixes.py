import pytest
from app.tutor.answer_validator import validate_tutor_response, AnswerValidator

def test_validator_does_not_replace_valid_answer_with_raw_quote():
    """
    REGRESSION TEST (Bug 1):
    Given a valid LLM answer that does not contain the exact target string:
    'Using trapezoids, we can approximate the area under the curve...'
    Verify the validator MUST NOT replace it with raw PDF source text!
    """
    target_name = "Trapezoidal Rule"
    llm_answer = (
        "### Trapezoid Method Explanation\n\n"
        "Using trapezoids, we can approximate the definite integral by connecting points "
        "along the function curve with linear line segments. The step size h is (b - a)/n."
    )
    retrieved_chunks = [
        {
            "chunk_id": "chunk_1",
            "document_title": "Chapter_5_Numerical_Integration.pdf",
            "page_number": 2,
            "relevance_category": "PRIMARY_TARGET",
            "content": "RAW PDF TEXT: Chapter 5 Numerical Integration Trapezoidal rule is given by dividing interval..."
        }
    ]
    citations = [{"document_title": "Chapter_5_Numerical_Integration.pdf", "page": 2}]

    validated_answer, validated_citations = validate_tutor_response(
        answer=llm_answer,
        target_name=target_name,
        retrieved_chunks=retrieved_chunks,
        citations=citations
    )

    # ASSERTIONS:
    # 1. Answer must NOT equal the raw chunk content!
    assert retrieved_chunks[0]["content"] not in validated_answer
    assert "> \"RAW PDF TEXT" not in validated_answer
    # 2. Synthesized explanation must be preserved
    assert "Using trapezoids, we can approximate" in validated_answer

def test_validator_does_not_replace_example_query_with_raw_quote():
    """
    REGRESSION TEST (Bug 1 - Example target):
    Given a synthesized answer for 'Example 5.2.7' that explains the rocket acceleration problem,
    Verify the validator keeps the synthesized text and does NOT replace it with raw chunk quotes.
    """
    target_name = "Example 5.2.7"
    llm_answer = (
        "### Rocket Acceleration Worked Problem\n\n"
        "To find the velocity at t = 80 seconds, we integrate acceleration a(t) from 0 to 80 seconds "
        "using Simpson's 1/3 rule. Applying the formula gives a final velocity of 3086.1 m/s."
    )
    retrieved_chunks = [
        {
            "chunk_id": "chunk_12",
            "document_title": "Chapter_5_Numerical_Integration.pdf",
            "page_number": 12,
            "relevance_category": "PRIMARY_TARGET",
            "content": "12 = 5 3 [ 370 + 1420 + 350 ] Example 5.2.7. The rocket is launched from the ground..."
        }
    ]
    citations = [{"document_title": "Chapter_5_Numerical_Integration.pdf", "page": 12}]

    validated_answer, validated_citations = validate_tutor_response(
        answer=llm_answer,
        target_name=target_name,
        retrieved_chunks=retrieved_chunks,
        citations=citations
    )

    # ASSERTIONS:
    assert retrieved_chunks[0]["content"] not in validated_answer
    assert "> \"12 = 5 3" not in validated_answer
    assert "3086.1 m/s" in validated_answer

def test_validator_empty_answer_returns_notice_not_raw_quote():
    """
    REGRESSION TEST:
    Given an empty or insufficient LLM answer, verify the validator returns an explicit
    insufficient response notice and NEVER raw PDF chunk text.
    """
    target_name = "Simpson's 3/8 Rule"
    llm_answer = ""
    retrieved_chunks = [
        {
            "chunk_id": "chunk_20",
            "document_title": "Chapter_5_Numerical_Integration.pdf",
            "page_number": 20,
            "relevance_category": "PRIMARY_TARGET",
            "content": "State Simpson's 3/8 rule and evaluate integral..."
        }
    ]
    citations = []

    validated_answer, validated_citations = validate_tutor_response(
        answer=llm_answer,
        target_name=target_name,
        retrieved_chunks=retrieved_chunks,
        citations=citations
    )

    assert "unable to synthesize a complete response" in validated_answer
    assert retrieved_chunks[0]["content"] not in validated_answer
    assert "> \"" not in validated_answer
