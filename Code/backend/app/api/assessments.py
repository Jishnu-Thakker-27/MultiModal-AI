import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.repositories import Repository
from app.schemas.schemas import QuestionGenRequest, QuizSubmitRequest, QuizSubmitResponse, QuizGradedAnswer
from app.assessment.question_generator import generate_questions_from_content
from app.assessment.question_validator import verify_question_batch
from app.assessment.grading import grade_user_answer
from app.rag.retriever import retrieve_top_chunks

router = APIRouter(prefix="/api", tags=["Assessments"])

# In-memory question cache for demo attempts
QUESTION_STORE = {}

@router.post("/courses/{course_id}/assessments/generate")
def generate_assessment(
    course_id: str,
    payload: QuestionGenRequest,
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    course = repo.get_course(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    topic_name = "Course Concepts"
    if payload.topic_id:
        t = repo.get_topic_by_id(payload.topic_id)
        if t:
            topic_name = t.name

    chunks = retrieve_top_chunks(db, course_id, topic_name, top_k=5)
    
    # Generate -> Verify -> Accept loop
    generated = generate_questions_from_content(
        topic_name=topic_name,
        chunks=chunks,
        difficulty=payload.difficulty,
        question_count=payload.question_count,
        question_type=payload.question_type
    )

    verified_questions = verify_question_batch(generated)

    # Store in memory cache for grading lookup
    assessment_id = str(uuid.uuid4())
    formatted = []
    for q in verified_questions:
        q_id = str(uuid.uuid4())
        q["id"] = q_id
        q["assessment_id"] = assessment_id
        QUESTION_STORE[q_id] = q
        formatted.append({
            "id": q_id,
            "assessment_id": assessment_id,
            "question_text": q["question_text"],
            "question_type": q["question_type"],
            "options": q.get("options"),
            "difficulty": q["difficulty"],
            "source_metadata": q.get("source_metadata", {})
        })

    return {"assessment_id": assessment_id, "questions": formatted}

@router.post("/assessments/{assessment_id}/submit", response_model=QuizSubmitResponse)
def submit_assessment(
    assessment_id: str,
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    user = repo.get_or_create_user()

    total_score = 0.0
    graded_answers = []

    for item in payload.answers:
        q_data = QUESTION_STORE.get(item.question_id)
        if not q_data:
            # Fallback mock question if cache cleared
            q_data = {
                "question_type": "MCQ",
                "correct_answer": "O(log N)",
                "explanation": "Balanced search trees have log(N) height.",
                "topic_id": payload.topic_id,
                "source_metadata": {"source_type": "pdf", "document_title": "Data Structures.pdf", "page": 143}
            }

        is_correct, score = grade_user_answer(
            q_type=q_data.get("question_type", "MCQ"),
            user_answer=item.user_answer,
            correct_answer=q_data.get("correct_answer", "O(log N)"),
            explanation=q_data.get("explanation", "")
        )

        total_score += score

        # Update mastery in database
        topic_id = payload.topic_id or q_data.get("topic_id")
        updated_mastery = 50.0
        if topic_id:
            updated_mastery = repo.update_mastery(user.id, topic_id, score, is_correct)

        graded_answers.append(QuizGradedAnswer(
            question_id=item.question_id,
            user_answer=item.user_answer,
            correct_answer=q_data.get("correct_answer", ""),
            is_correct=is_correct,
            score=score,
            explanation=q_data.get("explanation", ""),
            source_metadata=q_data.get("source_metadata", {})
        ))

    pct = round((total_score / max(len(payload.answers), 1)) * 100, 1)

    return QuizSubmitResponse(
        attempt_id=str(uuid.uuid4()),
        total_score=total_score,
        percentage=pct,
        graded_answers=graded_answers,
        updated_mastery=pct
    )
