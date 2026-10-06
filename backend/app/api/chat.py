from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.repositories import Repository
from app.schemas.schemas import ChatRequest, ChatResponse
from app.rag.retriever import retrieve_top_chunks
from app.rag.reranker import rerank_chunks
from app.rag.generator import generate_grounded_answer

from app.tutor.intent_classifier import classify_learning_intent
from app.tutor.teaching_planner import TeachingPlanner
from app.tutor.answer_validator import validate_tutor_response

router = APIRouter(prefix="/api/courses", tags=["Chat"])

@router.post("/{course_id}/chat", response_model=ChatResponse)
def chat_with_tutor(
    course_id: str,
    payload: ChatRequest,
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    course = repo.get_course(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    user_id = payload.user_id or "demo_student"
    tone = payload.tone or "Intuitive Analogy"
    conv = repo.get_or_create_conversation(course_id, payload.conversation_id, user_id=user_id)
    messages = repo.get_conversation_messages(conv.id)

    # 1. Intent Classification & Teaching Plan
    intent_info = classify_learning_intent(payload.question)
    learner_profile = repo.get_learner_profile(user_id=user_id, course_id=course_id)

    # 2. Retrieve top vector chunks for query
    retrieved_chunks = retrieve_top_chunks(db, course_id, payload.question, top_k=5)

    # 3. Rerank chunks
    reranked_chunks = rerank_chunks(retrieved_chunks, payload.question)

    # 4. Create pedagogical teaching plan
    pedagogical_context = {
        "target_name": payload.question,
        "target_coverage_state": "STATE_C_SUFFICIENT_INFO" if reranked_chunks else "STATE_A_NOT_FOUND",
        "learner_profile": learner_profile
    }
    teaching_plan = TeachingPlanner().create_plan(
        payload.question, intent_info, pedagogical_context, reranked_chunks, tone=tone
    )

    # 5. Generate grounded master tutor answer & citations
    raw_answer, citations, is_grounded = generate_grounded_answer(
        payload.question, reranked_chunks, teaching_plan, conversation_history=messages
    )
    answer, citations = validate_tutor_response(raw_answer, payload.question, reranked_chunks, citations)

    # 6. Save chat messages to history
    repo.save_chat_messages(conv.id, payload.question, answer, citations)

    return ChatResponse(
        conversation_id=conv.id,
        question=payload.question,
        answer=answer,
        is_grounded=is_grounded,
        citations=citations
    )

@router.get("/{course_id}/chat/history")
def get_chat_history(course_id: str, db: Session = Depends(get_db)):
    repo = Repository(db)
    return repo.get_conversation_history(course_id)
