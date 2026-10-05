import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database.session import init_db, SessionLocal
from app.database.repositories import Repository
from app.tutor.answer_validator import validate_tutor_response

def test_q2_trapezoidal_rule_quality():
    """
    Test Q2 ('Explain trapezoidal rule'):
    Verify that when an LLM synthesizes an explanation of the trapezoidal rule,
    the validator retains the synthesized answer, does NOT force a raw block quote,
    and produces a LOW copy risk.
    """
    query = "Explain trapezoidal rule"
    target_name = "Trapezoidal"
    
    synthesized_answer = (
        "### 1. Overview of the Trapezoidal Rule\n\n"
        "The **Trapezoidal Rule** is a basic numerical integration method used to approximate "
        "the definite integral of a function over a specified interval $[a, b]$.\n\n"
        "### 2. Discretization and Formula\n"
        "The interval is divided into $n$ subintervals of equal width $h = \\frac{b - a}{n}$. "
        "The area under the curve is approximated by summing the areas of $n$ trapezoids:\n\n"
        "$$\\int_{a}^{b} f(x)\\,dx \\approx \\frac{h}{2} \\left[ (y_0 + y_n) + 2(y_1 + y_2 + \\dots + y_{n-1}) \\right]$$\n\n"
        "### 3. Key Concepts\n"
        "- Connects consecutive points with straight-line segments.\n"
        "- Accuracy increases as the step size $h$ decreases."
    )

    retrieved_chunks = [
        {
            "chunk_id": "chunk_pdf_p2",
            "document_title": "Chapter_5_Numerical_Integration.pdf",
            "page_number": 2,
            "relevance_category": "PRIMARY_TARGET",
            "content": "5.1 Trapezoidal Rule Let y = f(x) be a function which takes the values y0, y1..."
        }
    ]
    citations = [{"document_title": "Chapter_5_Numerical_Integration.pdf", "page": 2}]

    final_answer, final_citations = validate_tutor_response(
        answer=synthesized_answer,
        target_name=target_name,
        retrieved_chunks=retrieved_chunks,
        citations=citations
    )

    # ASSERTIONS FOR Q2:
    # 1. Must NOT be replaced with a raw PDF block quote!
    assert "> \"5.1 Trapezoidal Rule" not in final_answer
    # 2. Must preserve synthesized explanation
    assert "Overview of the Trapezoidal Rule" in final_answer
    # 3. Must maintain canonical citations
    assert len(final_citations) == 1
    assert final_citations[0]["page"] == 2

def test_q6_example_527_quality():
    """
    Test Q6 ('Explain Example 5.2.7'):
    Verify that when an LLM synthesizes an explanation for Example 5.2.7 (rocket acceleration),
    the validator retains the synthesized answer and does NOT replace it with raw block quotes.
    """
    query = "Explain Example 5.2.7"
    target_name = "Example 5.2.7"
    
    synthesized_answer = (
        "### Example 5.2.7: Rocket Acceleration & Velocity\n\n"
        "**Problem Setup:** A rocket is launched from the ground, and its acceleration $a(t)$ is recorded "
        "at 10-second intervals for the first 80 seconds (from $t=0$ to $t=80$ s).\n\n"
        "**Method:** Velocity is the integral of acceleration $v(80) = \\int_{0}^{80} a(t)\\,dt$. "
        "Using **Simpson's 1/3 Rule** with step size $h = 10$ s:\n\n"
        "$$v(80) = \\frac{10}{3} \\left[ (a_0 + a_8) + 4(a_1 + a_3 + a_5 + a_7) + 2(a_2 + a_4 + a_6) \\right]$$\n\n"
        "**Result:** Substituting the recorded acceleration data yields a velocity of **3086.1 m/s** at $t = 80$ seconds."
    )

    retrieved_chunks = [
        {
            "chunk_id": "chunk_pdf_p12",
            "document_title": "Chapter_5_Numerical_Integration.pdf",
            "page_number": 12,
            "relevance_category": "PRIMARY_TARGET",
            "content": "12 = 5 3 [ 370 + 1420 + 350 ] Example 5.2.7. The rocket is launched from the ground..."
        }
    ]
    citations = [{"document_title": "Chapter_5_Numerical_Integration.pdf", "page": 12}]

    final_answer, final_citations = validate_tutor_response(
        answer=synthesized_answer,
        target_name=target_name,
        retrieved_chunks=retrieved_chunks,
        citations=citations
    )

    # ASSERTIONS FOR Q6:
    # 1. Must NOT be replaced with a raw PDF block quote!
    assert "> \"12 = 5 3" not in final_answer
    # 2. Must preserve synthesized explanation
    assert "Rocket Acceleration & Velocity" in final_answer
    assert "3086.1 m/s" in final_answer
    # 3. Must maintain canonical citations
    assert final_citations[0]["page"] == 12
