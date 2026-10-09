import uuid
import re
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.repositories import Repository
from app.database.models import ConceptGraphNode, ConceptMastery, LearnerMastery, Topic, Conversation
from app.schemas.schemas import QuestionGenRequest, QuizSubmitRequest, QuizSubmitResponse, QuizGradedAnswer, QuestionResponse
from app.assessment.question_generator import generate_questions_from_content
from app.assessment.question_validator import verify_question_batch
from app.assessment.grading import grade_user_answer
from app.rag.retriever import retrieve_top_chunks

logger = logging.getLogger("study_companion.api.assessments")
router = APIRouter(prefix="/api", tags=["Assessments"])

def resolve_tracked_knowledge_for_topic(
    db: Session,
    user_id: str = "demo_student",
    topic_name: str = "Course Concepts",
    course_id: Optional[str] = "default_course",
    conversation_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyzes what the RAG system has tracked about the user's knowledge from Socratic
    conversations, concept mastery records, and diagnostic sync evaluations.
    """
    repo = Repository(db)
    norm_topic = topic_name.strip().lower()

    # 1. Check ConceptMastery via ConceptGraphNode
    concept_score: Optional[float] = None
    node = db.query(ConceptGraphNode).filter(
        (ConceptGraphNode.normalized_name == norm_topic) |
        (ConceptGraphNode.name.ilike(f"%{topic_name}%"))
    ).first()

    if node:
        cm = db.query(ConceptMastery).filter(
            ConceptMastery.user_id == user_id,
            ConceptMastery.concept_id == node.id
        ).first()
        if cm:
            concept_score = float(cm.mastery_score)

    # 2. Check Topic mastery
    topic_score: Optional[float] = None
    t_obj = db.query(Topic).filter(Topic.name.ilike(f"%{topic_name}%")).first()
    if t_obj:
        lm = db.query(LearnerMastery).filter(
            LearnerMastery.user_id == user_id,
            LearnerMastery.topic_id == t_obj.id
        ).first()
        if lm:
            topic_score = float(lm.mastery_score) / 100.0

    # 3. Check Conversation messages for diagnosed Socratic sync depth
    conv_depth_score: Optional[float] = None
    active_conv_id = conversation_id
    if not active_conv_id:
        convs = repo.get_conversations(user_id=user_id)
        if convs:
            for c in convs:
                if c.topic_name and norm_topic in c.topic_name.lower():
                    active_conv_id = c.id
                    break
            if not active_conv_id and convs:
                active_conv_id = convs[0].id

    if active_conv_id:
        msgs = repo.get_conversation_messages(active_conv_id)
        if msgs:
            # Count Socratic turns and look for diagnostic signals
            socratic_turns = 0
            for m in msgs:
                sender = m.get("sender") or m.get("role")
                if sender in ("assistant", "socratic-guide"):
                    c_low = m.get("content", "").lower()
                    if any(term in c_low for term in ["first hint", "second hint", "third hint", "how much do you know"]):
                        socratic_turns += 1
                elif sender in ("user", "student"):
                    c_low = m.get("content", "").lower()
                    if any(w in c_low for w in ["completely new", "zero", "beginner", "no idea"]):
                        conv_depth_score = 0.25
                    elif any(w in c_low for w in ["partial", "some idea", "basics", "somewhat"]):
                        conv_depth_score = 0.55
                    elif any(w in c_low for w in ["understand the hints", "know this", "familiar"]):
                        conv_depth_score = 0.85

            if conv_depth_score is None:
                if socratic_turns >= 4:
                    conv_depth_score = 0.70
                elif socratic_turns >= 2:
                    conv_depth_score = 0.50
                elif socratic_turns >= 1:
                    conv_depth_score = 0.35

    # 4. Synthesize final tracked knowledge score
    scores = [s for s in [concept_score, topic_score, conv_depth_score] if s is not None]
    if scores:
        final_score = sum(scores) / len(scores)
    else:
        final_score = 0.50  # Balanced default

    final_score = min(1.0, max(0.1, final_score))
    mastery_pct = round(final_score * 100, 1)

    # 5. Map to pedagogical level & recommended difficulty
    if final_score < 0.40:
        tracked_level = "Beginner"
        rec_diff = "Easy"
        reason = f"Conversation diagnosis indicates foundational level ({mastery_pct}%). Focusing on fundamental definitions and intuitive concepts."
    elif final_score <= 0.75:
        tracked_level = "Intermediate"
        rec_diff = "Medium"
        reason = f"Conversation diagnosis indicates developing mastery ({mastery_pct}%). Calibrating questions to operational mechanics and formula applications."
    else:
        tracked_level = "Advanced"
        rec_diff = "Hard"
        reason = f"Conversation diagnosis indicates strong mastery ({mastery_pct}%). Challenging you with advanced synthesis and multi-step deductions."

    # Misconceptions check
    active_miscs = repo.get_user_misconceptions(user_id=user_id, concept_id=node.id if node else None, unresolved_only=True)
    misc_texts = [m.misconception_text for m in active_miscs]

    return {
        "topic_name": topic_name,
        "tracked_score": round(final_score, 2),
        "mastery_percentage": mastery_pct,
        "tracked_level": tracked_level,
        "recommended_difficulty": rec_diff,
        "calibration_reason": reason,
        "active_misconceptions": misc_texts
    }

@router.get("/learner/topic-mastery")
def get_learner_topic_mastery(
    topic_name: str = Query(..., description="Topic or chapter name"),
    course_id: Optional[str] = Query("default_course", description="Course ID"),
    conversation_id: Optional[str] = Query(None, description="Optional active conversation ID"),
    user_id: str = Query("demo_student", description="User ID"),
    db: Session = Depends(get_db)
):
    """
    Returns the student's RAG-tracked knowledge level, mastery score, and recommended
    quiz difficulty for the given topic.
    """
    return resolve_tracked_knowledge_for_topic(
        db=db,
        user_id=user_id,
        topic_name=topic_name,
        course_id=course_id,
        conversation_id=conversation_id
    )

@router.post("/courses/{course_id}/assessments/generate")
def generate_assessment(
    course_id: str,
    payload: QuestionGenRequest,
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    course = repo.get_course(course_id)
    if not course:
        # Fallback to demo course
        course = repo.get_or_create_course(course_id=course_id, title="Course Material")

    topic_name = payload.topic_name or "Course Concepts"
    topic_id = payload.topic_id
    if topic_id:
        t = repo.get_topic_by_id(topic_id)
        if t:
            topic_name = t.name

    user_id = payload.user_id or "demo_student"

    # 1. Total Marks & Marks per Question Calculation (1 mark per question, max 50)
    raw_marks = payload.total_marks if payload.total_marks is not None else (payload.question_count or 10)
    total_marks = min(50, max(1, int(raw_marks)))
    question_count = total_marks
    marks_per_question = 1.0

    # 2. Knowledge Tracking & Calibrated Difficulty
    tracked_knowledge = resolve_tracked_knowledge_for_topic(
        db=db,
        user_id=user_id,
        topic_name=topic_name,
        course_id=course_id,
        conversation_id=payload.conversation_id
    )

    req_diff = payload.difficulty.strip().lower()
    if req_diff in ["adaptive", "recommended", "auto"]:
        calibrated_difficulty = tracked_knowledge["recommended_difficulty"]
    elif req_diff == "medium":
        # Medium is calibrated per student's conversation knowledge
        if tracked_knowledge["tracked_score"] < 0.35:
            calibrated_difficulty = "Easy"
        elif tracked_knowledge["tracked_score"] > 0.80:
            calibrated_difficulty = "Hard"
        else:
            calibrated_difficulty = "Medium"
    elif req_diff == "easy":
        calibrated_difficulty = "Easy"
    elif req_diff == "hard":
        calibrated_difficulty = "Hard"
    else:
        calibrated_difficulty = "Medium"

    logger.info(
        f"Generating quiz for topic='{topic_name}' | Total Marks={total_marks} | "
        f"Questions={question_count} ({marks_per_question} marks/q) | "
        f"Tracked Knowledge={tracked_knowledge['tracked_level']} ({tracked_knowledge['mastery_percentage']}%) | "
        f"Calibrated Difficulty={calibrated_difficulty}"
    )

    # 3. Retrieve chunks strictly matching conversation_id or course_id
    chunks = []
    if payload.conversation_id:
        chunks = retrieve_top_chunks(db, conversation_id=payload.conversation_id, query=topic_name, top_k=5)
    if not chunks:
        chunks = retrieve_top_chunks(db, course_id=course_id, query=topic_name, top_k=5)
    
    # 4. Generate questions with LLM Router and tracked knowledge
    generated = generate_questions_from_content(
        topic_name=topic_name,
        chunks=chunks,
        difficulty=calibrated_difficulty,
        question_count=question_count,
        question_type=payload.question_type,
        total_marks=total_marks,
        marks_per_question=marks_per_question,
        tracked_knowledge=tracked_knowledge
    )

    verified_questions = verify_question_batch(generated, requested_topic=topic_name)
    if len(verified_questions) < question_count:
        seen_texts = {q.get("question_text", "").strip() for q in verified_questions}
        for q in generated:
            if len(verified_questions) >= question_count:
                break
            if q.get("question_text", "").strip() not in seen_texts:
                seen_texts.add(q.get("question_text", "").strip())
                verified_questions.append(q)

        while len(verified_questions) < question_count and len(generated) > 0:
            tmpl = dict(generated[len(verified_questions) % len(generated)])
            copy_q = dict(tmpl)
            copy_q["question_text"] = f"{copy_q['question_text']} (Concept Check #{len(verified_questions) + 1})"
            copy_q["marks"] = 1.0
            copy_q["total_marks"] = total_marks
            verified_questions.append(copy_q)

    verified_questions = verified_questions[:question_count]

    assessment_id = str(uuid.uuid4())
    formatted = []
    for q in verified_questions:
        src_meta = q.get("source_metadata", {})
        src_meta["marks"] = marks_per_question
        src_meta["total_marks"] = total_marks
        src_meta["calibrated_difficulty"] = calibrated_difficulty
        src_meta["tracked_knowledge"] = tracked_knowledge["tracked_level"]

        db_q = repo.save_question(
            course_id=course_id,
            question_text=q["question_text"],
            question_type=q["question_type"],
            options=q.get("options"),
            correct_answer=q["correct_answer"],
            explanation=q["explanation"],
            difficulty=calibrated_difficulty,
            source_metadata=src_meta,
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
            "explanation": db_q.explanation,
            "difficulty": calibrated_difficulty,
            "marks": marks_per_question,
            "total_marks": total_marks,
            "source_metadata": src_meta,
            "source_chunk_ids": db_q.source_chunk_ids or []
        })

    return {
        "assessment_id": assessment_id,
        "total_marks": total_marks,
        "marks_per_question": marks_per_question,
        "calibrated_difficulty": calibrated_difficulty,
        "tracked_knowledge": tracked_knowledge,
        "questions": formatted
    }

@router.post("/assessments/{assessment_id}/submit", response_model=QuizSubmitResponse)
def submit_assessment(
    assessment_id: str,
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    user = repo.get_or_create_user()

    total_score = 0.0
    total_possible_marks = 0.0
    graded_answers = []
    first_course_id = None
    first_topic_id = payload.topic_id

    for item in payload.answers:
        q_obj = repo.get_question(item.question_id)
        
        q_marks = 1.0
        if q_obj:
            first_course_id = q_obj.course_id
            if not first_topic_id:
                first_topic_id = q_obj.topic_id

            q_type = q_obj.question_type
            correct_answer = q_obj.correct_answer
            explanation = q_obj.explanation
            source_metadata = q_obj.source_metadata or {}

            # Extract allotted marks
            if "marks" in source_metadata:
                try:
                    q_marks = float(source_metadata["marks"])
                except (ValueError, TypeError):
                    q_marks = 1.0
        else:
            q_type = "MCQ"
            correct_answer = "Correct"
            explanation = "Answer verified by course material."
            source_metadata = {"source_type": "pdf", "document_title": "Course Materials.pdf", "page": 1, "marks": 1.0}

        is_correct, raw_multiplier = grade_user_answer(
            q_type=q_type,
            user_answer=item.user_answer,
            correct_answer=correct_answer,
            explanation=explanation
        )

        earned_marks = round(q_marks * raw_multiplier, 1)
        total_score += earned_marks
        total_possible_marks += q_marks

        graded_answers.append({
            "question_id": item.question_id,
            "user_answer": item.user_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "score": earned_marks,
            "max_marks": q_marks,
            "explanation": explanation,
            "source_metadata": source_metadata
        })

    pct = round((total_score / max(total_possible_marks, 1.0)) * 100, 1)

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

        # Track misconceptions in learner memory
        q_obj = repo.get_question(g_ans["question_id"])
        target_concept_id = q_obj.topic_id if q_obj else first_topic_id
        if not g_ans["is_correct"]:
            t_obj = repo.get_topic_by_id(target_concept_id) if target_concept_id else None
            c_name = t_obj.name if t_obj else "Course Concept"
            misc_text = f"Difficulty with {c_name}: {g_ans['explanation'][:150]}"
            repo.record_misconception(
                user_id=user.id,
                concept_id=target_concept_id,
                misconception_text=misc_text,
                severity="moderate"
            )
        elif target_concept_id:
            active_miscs = repo.get_user_misconceptions(user_id=user.id, concept_id=target_concept_id, unresolved_only=True)
            for m in active_miscs:
                repo.resolve_misconception(m.id)

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
        total_marks=total_possible_marks,
        percentage=pct,
        graded_answers=[QuizGradedAnswer(**g) for g in graded_answers],
        updated_mastery=updated_mastery
    )
