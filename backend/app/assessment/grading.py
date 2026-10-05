import logging
from typing import Dict, Any, Tuple
from app.config import settings

logger = logging.getLogger("study_companion.assessment.grading")

def grade_mcq(user_answer: str, correct_answer: str) -> Tuple[bool, float]:
    is_correct = user_answer.strip().lower() == correct_answer.strip().lower()
    return is_correct, 1.0 if is_correct else 0.0

def grade_numerical(user_answer: str, correct_answer: str) -> Tuple[bool, float]:
    try:
        u_val = float(user_answer.strip())
        c_val = float(correct_answer.strip())
        is_correct = abs(u_val - c_val) <= 0.01
        return is_correct, 1.0 if is_correct else 0.0
    except ValueError:
        return False, 0.0

def grade_short_answer(user_answer: str, correct_answer: str, explanation: str) -> Tuple[bool, float]:
    if not user_answer or not user_answer.strip():
        return False, 0.0

    if settings.OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            prompt = f"""Evaluate the student's short answer response against the reference answer and explanation.

STUDENT RESPONSE:
{user_answer}

REFERENCE ANSWER:
{correct_answer}

EXPLANATION:
{explanation}

Respond in JSON format:
{{"is_correct": true/false, "score": 1.0 or 0.0 or 0.5, "feedback": "..."}}"""

            res = client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            parsed = json.loads(res.choices[0].message.content)
            return parsed.get("is_correct", False), parsed.get("score", 0.0)
        except Exception as e:
            logger.warning(f"LLM grading failed ({e}). Using keyword similarity fallback.")

    # Keyword overlap fallback
    ref_words = set(correct_answer.lower().split())
    user_words = set(user_answer.lower().split())
    overlap = len(ref_words.intersection(user_words))
    is_correct = overlap >= 2 or len(user_answer.strip()) > 15
    return is_correct, 1.0 if is_correct else 0.0

def grade_user_answer(q_type: str, user_answer: str, correct_answer: str, explanation: str) -> Tuple[bool, float]:
    if q_type == "MCQ":
        return grade_mcq(user_answer, correct_answer)
    elif q_type == "Numerical":
        return grade_numerical(user_answer, correct_answer)
    else:
        return grade_short_answer(user_answer, correct_answer, explanation)
