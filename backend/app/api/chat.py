from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.repositories import Repository
from app.schemas.schemas import ChatRequest, ChatResponse
from app.rag.retriever import retrieve_top_chunks
from app.rag.reranker import rerank_chunks
from app.rag.generator import generate_grounded_answer

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

    # 1. Retrieve top vector chunks for query
    retrieved_chunks = retrieve_top_chunks(db, course_id, payload.question, top_k=5)

    # 2. Rerank chunks
    reranked_chunks = rerank_chunks(retrieved_chunks, payload.question)

    # 3. Generate grounded answer & citations
    answer, citations, is_grounded = generate_grounded_answer(payload.question, reranked_chunks)

    # 4. Get/Create DB Conversation & Save History
    conv = repo.get_or_create_conversation(course_id, payload.conversation_id)
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
