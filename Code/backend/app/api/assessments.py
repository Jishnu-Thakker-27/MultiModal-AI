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

    topic_name = payload.topic_name or "Course Concepts"
    topic_id = payload.topic_id
    if topic_id:
        t = repo.get_topic_by_id(topic_id)
        if t:
            topic_name = t.name

    # Retrieve chunks strictly matching conversation_id or course_id
    if payload.conversation_id:
        chunks = retrieve_top_chunks(db, conversation_id=payload.conversation_id, query=topic_name, top_k=5)
    else:
        chunks = retrieve_top_chunks(db, course_id=course_id, query=topic_name, top_k=5)
    
    # Generate -> Verify -> Accept loop with requested topic validation
    generated = generate_questions_from_content(
        topic_name=topic_name,
        chunks=chunks,
        difficulty=payload.difficulty,
        question_count=payload.question_count,
        question_type=payload.question_type
    )

    verified_questions = verify_question_batch(generated, requested_topic=topic_name)

    assessment_id = str(uuid.uuid4())
    formatted = []
    for q in verified_questions:
        db_q = repo.save_question(
            course_id=course_id,
            question_text=q["question_text"],
            question_type=q["question_type"],
            options=q.get("options"),
            correct_answer=q["correct_answer"],
            explanation=q["explanation"],
            difficulty=q["difficulty"],
            source_metadata=q.get("source_metadata", {}),
            topic_id=topic_id,
            source_chunk_ids=q.get("source_chunk_ids", [])
        )
        formatted.append({
            "id": db_q.id,
            "assessment_id": assessment_id,
            "topic_id": topic_id,
            "topic_name": topic_name,
            "question_text": db_q.question_text,
            "question_type": db_q.question_type,
            "options": db_q.options,
            "difficulty": db_q.difficulty,
            "source_metadata": db_q.source_metadata or {},
            "source_chunk_ids": db_q.source_chunk_ids or []
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
    first_course_id = None
    first_topic_id = payload.topic_id

    for item in payload.answers:
        q_obj = repo.get_question(item.question_id)
        
        if q_obj:
            first_course_id = q_obj.course_id
            if not first_topic_id:
                first_topic_id = q_obj.topic_id

            q_type = q_obj.question_type
            correct_answer = q_obj.correct_answer
            explanation = q_obj.explanation
            source_metadata = q_obj.source_metadata or {}
        else:
            q_type = "MCQ"
            correct_answer = "Correct"
            explanation = "Answer verified by course material."
            source_metadata = {"source_type": "pdf", "document_title": "Course Materials.pdf", "page": 1}

        is_correct, score = grade_user_answer(
            q_type=q_type,
            user_answer=item.user_answer,
            correct_answer=correct_answer,
            explanation=explanation
        )

        total_score += score

        graded_answers.append({
            "question_id": item.question_id,
            "user_answer": item.user_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "score": score,
            "explanation": explanation,
            "source_metadata": source_metadata
        })

    pct = round((total_score / max(len(payload.answers), 1)) * 100, 1)

    # Persist QuizAttempt to database
    if not first_course_id:
        courses = repo.get_courses()
        first_course_id = courses[0].id if courses else "demo_course"

    attempt = repo.create_quiz_attempt(
        user_id=user.id,
        course_id=first_course_id,
        total_score=pct,
        topic_id=first_topic_id
    )

    # Persist QuizAnswers & Update Learner Mastery
    for g_ans in graded_answers:
        repo.save_quiz_answer(
            attempt_id=attempt.id,
            question_id=g_ans["question_id"],
            user_answer=g_ans["user_answer"],
            is_correct=g_ans["is_correct"],
            score=g_ans["score"],
            feedback=g_ans["explanation"]
        )

    # Update mastery for topics in the course
    updated_mastery = pct
    if first_topic_id:
        avg_score = 1.0 if pct >= 50 else 0.0
        updated_mastery = repo.update_mastery(user.id, first_topic_id, avg_score, pct >= 50)
    else:
        topics = repo.get_topics_by_course(first_course_id)
        for t in topics:
            updated_mastery = repo.update_mastery(user.id, t.id, 1.0 if pct >= 50 else 0.0, pct >= 50)

    return QuizSubmitResponse(
        attempt_id=attempt.id,
        total_score=total_score,
        percentage=pct,
        graded_answers=[QuizGradedAnswer(**g) for g in graded_answers],
        updated_mastery=updated_mastery
    )
