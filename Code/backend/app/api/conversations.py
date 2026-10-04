import os
import re
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.repositories import Repository
from app.schemas.schemas import (
    ConversationCreate,
    ConversationResponse,
    ConversationDetailResponse,
    ConversationUpdateRequest,
    ChatRequest,
    ChatResponse,
    DocumentResponse
)
from app.rag.retriever import retrieve_top_chunks
from app.rag.reranker import rerank_chunks
from app.rag.generator import generate_grounded_answer
from app.tutor.intent_classifier import classify_learning_intent
from app.tutor.prerequisite_resolver import PrerequisiteResolver
from app.tutor.teaching_planner import TeachingPlanner
from app.tutor.answer_validator import validate_tutor_response
from app.rag.hierarchical_retriever import retrieve_hierarchical_chunks, retrieve_document_summary_chunks
from app.knowledge.graph_manager import GraphManager
from app.ingestion.pdf_processor import extract_pdf_content
from app.ingestion.ppt_processor import extract_pptx_content
from app.ingestion.video_processor import extract_video_content
from app.ingestion.chunker import chunk_extracted_content
from app.rag.embeddings import generate_batch_embeddings
from datetime import datetime

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=List[ConversationResponse])
def list_conversations(
    user_id: str = "demo_student",
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    convs = repo.get_conversations(user_id=user_id)
    res = []
    for c in convs:
        msgs = repo.get_conversation_messages(c.id)
        docs = repo.get_conversation_documents(c.id)
        last_msg = msgs[-1]["created_at"] if msgs else (c.updated_at or c.created_at or datetime.utcnow())
        res.append(ConversationResponse(
            id=c.id,
            title=c.title,
            course_id=c.course_id,
            topic_name=c.topic_name,
            status=c.status,
            message_count=len(msgs),
            last_message_at=last_msg,
            created_at=c.created_at or datetime.utcnow(),
            updated_at=c.updated_at or c.created_at or datetime.utcnow(),
            sources_count=len(docs)
        ))
    return res

@router.post("", response_model=ConversationDetailResponse)
def create_conversation(
    payload: ConversationCreate,
    user_id: str = "demo_student",
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    title = payload.title or "New Learning Session"
    conv = repo.create_conversation(
        user_id=user_id,
        course_id=payload.course_id or "default_course",
        title=title,
        topic_name=payload.topic_name
    )

    # Attach requested initial documents if any
    if payload.document_ids:
        for doc_id in payload.document_ids:
            repo.attach_document_to_conversation(conv.id, doc_id)

    # Process initial question if provided
    if payload.initial_question:
        question = payload.initial_question.strip()
        if not payload.title:
            repo.update_conversation(conv.id, title=question[:40] + ("..." if len(question)>40 else ""))

        intent_info = classify_learning_intent(question)
        if intent_info["intent"] in {"OVERVIEW", "DOCUMENT_SUMMARY"}:
            retrieved_chunks = retrieve_document_summary_chunks(db, conversation_id=conv.id, top_k=8)
            docs = repo.get_conversation_documents(conv.id)
            doc_title = "Uploaded Course Material"
            if docs and docs[0].title:
                clean_title = re.sub(r'\.(pdf|pptx|docx|txt)$', '', docs[0].title, flags=re.I)
                doc_title = re.sub(r'[-_–]', ' ', clean_title).strip()
            pedagogical_context = {"target_name": doc_title, "target_coverage_state": "STATE_C_SUFFICIENT_INFO"}
            teaching_plan = {"target_name": doc_title, "coverage_state": "STATE_C_SUFFICIENT_INFO", "teaching_stage": "DOCUMENT_OVERVIEW", "is_document_summary": True}
        else:
            pedagogical_context = PrerequisiteResolver(db).resolve_pedagogical_context(
                course_id=conv.course_id or "default_course", user_id=user_id, query=question,
                intent=intent_info["intent"], conversation_id=conv.id
            )
            retrieved_chunks = retrieve_hierarchical_chunks(
                db=db, query=question, target_name=pedagogical_context.get("target_name"),
                conversation_id=conv.id, course_id=conv.course_id, intent=intent_info["intent"],
                query_scope=intent_info.get("query_scope", "FOCUSED"), target_concept=pedagogical_context.get("target_concept"),
                prerequisite_nodes=pedagogical_context.get("prerequisites"),
                is_introductory=pedagogical_context.get("is_introductory_request", True), top_k=5
            )
            teaching_plan = TeachingPlanner().create_plan(question, intent_info, pedagogical_context, retrieved_chunks)
        raw_answer, citations, is_grounded = generate_grounded_answer(question, retrieved_chunks, teaching_plan)
        answer, citations = validate_tutor_response(raw_answer, pedagogical_context.get("target_name"), retrieved_chunks, citations)
        repo.save_chat_messages(conv.id, question, answer, citations)

    return get_conversation_details(conv.id, db)

@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation_details(
    conversation_id: str,
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = repo.get_conversation_messages(conversation_id)
    documents = repo.get_conversation_documents(conversation_id)

    msg_responses = []
    for m in messages:
        msg_responses.append({
            "id": m["id"],
            "role": m.get("sender") or m.get("role") or "assistant",
            "content": m["content"],
            "created_at": m["created_at"],
            "citations": m.get("citations") or []
        })

    doc_responses = []
    for d in documents:
        doc_responses.append({
            "id": d.id,
            "document_id": d.id,
            "title": d.title,
            "source_type": d.source_type,
            "file_path": d.file_path,
            "created_at": d.created_at
        })

    return ConversationDetailResponse(
        id=conv.id,
        title=conv.title,
        course_id=conv.course_id,
        topic_name=conv.topic_name,
        status=conv.status,
        created_at=conv.created_at or datetime.utcnow(),
        updated_at=conv.updated_at or conv.created_at or datetime.utcnow(),
        sources=doc_responses,
        messages=msg_responses
    )

@router.patch("/{conversation_id}", response_model=ConversationResponse)
def update_conversation(
    conversation_id: str,
    payload: ConversationUpdateRequest,
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    conv = repo.update_conversation(conversation_id, title=payload.title, topic_name=payload.topic_name)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs = repo.get_conversation_messages(conv.id)
    docs = repo.get_conversation_documents(conv.id)
    last_msg = msgs[-1]["created_at"] if msgs else (conv.updated_at or conv.created_at or datetime.utcnow())
    return ConversationResponse(
        id=conv.id,
        title=conv.title,
        course_id=conv.course_id,
        topic_name=conv.topic_name,
        status=conv.status,
        message_count=len(msgs),
        last_message_at=last_msg,
        created_at=conv.created_at or datetime.utcnow(),
        updated_at=conv.updated_at or conv.created_at or datetime.utcnow(),
        sources_count=len(docs)
    )

@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    deleted = repo.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "success", "message": "Conversation deleted"}

@router.post("/{conversation_id}/chat", response_model=ChatResponse)
def chat_in_conversation(
    conversation_id: str,
    payload: ChatRequest,
    debug: bool = Query(False, description="Enable RAG Debug Metadata"),
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    question = payload.question.strip()
    user_id = payload.user_id or "demo_student"

    if conv.title in ["New Chat", "New Learning Session", "Untitled Session"]:
        new_title = question[:35] + ("..." if len(question) > 35 else "")
        repo.update_conversation(conversation_id, title=new_title)

    messages = repo.get_conversation_messages(conversation_id)

    # 1. Intent Classification
    intent_info = classify_learning_intent(question)

    # 2. Generalized Target & 3-State Coverage Resolution (Strictly scoped to this conversation's attached sources!)
    if intent_info["intent"] in {"OVERVIEW", "DOCUMENT_SUMMARY"}:
        docs = repo.get_conversation_documents(conversation_id)
        doc_title = "Uploaded Course Material"
        if docs and docs[0].title:
            clean_title = re.sub(r'\.(pdf|pptx|docx|txt)$', '', docs[0].title, flags=re.I)
            doc_title = re.sub(r'[-_–]', ' ', clean_title).strip()
        pedagogical_context = {"target_name": doc_title, "target_coverage_state": "STATE_C_SUFFICIENT_INFO"}
        retrieved_chunks = retrieve_document_summary_chunks(db, conversation_id=conversation_id, top_k=8)
        teaching_plan = {"target_name": doc_title, "coverage_state": "STATE_C_SUFFICIENT_INFO", "teaching_stage": "DOCUMENT_OVERVIEW", "is_document_summary": True}
    else:
        pedagogical_context = PrerequisiteResolver(db).resolve_pedagogical_context(
            course_id=conv.course_id or "default_course", user_id=user_id, query=question,
            intent=intent_info["intent"], conversation_id=conversation_id, conversation_history=messages
        )
        retrieved_chunks = retrieve_hierarchical_chunks(
            db=db, query=question, target_name=pedagogical_context.get("target_name"),
            conversation_id=conversation_id, course_id=conv.course_id, intent=intent_info["intent"],
            query_scope=intent_info.get("query_scope", "FOCUSED"), target_concept=pedagogical_context.get("target_concept"),
            prerequisite_nodes=pedagogical_context.get("prerequisites"),
            is_introductory=pedagogical_context.get("is_introductory_request", True), top_k=5
        )
        teaching_plan = TeachingPlanner().create_plan(question, intent_info, pedagogical_context, retrieved_chunks)

    # 5. Grounded Tutor Response Generation (3-State Model)
    raw_answer, citations, is_grounded = generate_grounded_answer(question, retrieved_chunks, teaching_plan)

    # 6. Final Answer Validation
    answer, citations = validate_tutor_response(raw_answer, pedagogical_context.get("target_name"), retrieved_chunks, citations)

    # 7. Save Message History
    repo.save_chat_messages(conversation_id, question, answer, citations)

    # 8. Update Student Concept Mastery
    target_node = pedagogical_context.get("target_concept")
    if target_node:
        GraphManager(db).update_student_concept_mastery(user_id, target_node.id, delta=0.2)

    debug_info = None
    if debug:
        debug_info = {
            "query": question,
            "intent": intent_info,
            "target_name": pedagogical_context.get("target_name"),
            "target_coverage_state": pedagogical_context.get("target_coverage_state"),
            "teaching_stage": teaching_plan.get("teaching_stage"),
            "retrieved_chunks_count": len(retrieved_chunks),
            "chunks_summary": [
                {
                    "chunk_id": c.get("chunk_id"),
                    "page": c.get("page_number"),
                    "category": c.get("relevance_category"),
                    "score": c.get("final_score")
                } for c in retrieved_chunks
            ]
        }

    return ChatResponse(
        conversation_id=conversation_id,
        question=question,
        answer=answer,
        is_grounded=is_grounded,
        citations=citations,
        debug_info=debug_info
    )

@router.post("/{conversation_id}/documents/{document_id}")
def attach_document(
    conversation_id: str,
    document_id: str,
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    doc = repo.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    repo.attach_document_to_conversation(conversation_id, document_id)
    return {"status": "success", "message": f"Document '{doc.title}' attached to conversation."}

@router.post("/{conversation_id}/upload")
def upload_source_to_conversation(
    conversation_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    course_id = conv.course_id or "default_course"
    course_upload_dir = os.path.join(UPLOAD_DIR, course_id)
    os.makedirs(course_upload_dir, exist_ok=True)

    file_path = os.path.join(course_upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    ext = file.filename.split(".")[-1].lower()
    if ext in ["pdf"]:
        source_type = "pdf"
    elif ext in ["pptx", "ppt"]:
        source_type = "pptx"
    elif ext in ["mp4", "mov", "avi", "mkv"]:
        source_type = "video"
    else:
        source_type = "pdf"

    doc = repo.create_document(
        course_id=course_id,
        title=file.filename,
        source_type=source_type,
        file_path=file_path
    )

    extracted = []
    try:
        if source_type == "pdf":
            extracted = extract_pdf_content(file_path)
        elif source_type == "pptx":
            extracted = extract_pptx_content(file_path)
        elif source_type == "video":
            extracted = extract_video_content(file_path)
    except Exception as exc:
        repo.update_document_status(doc.id, "Failed", str(exc))
        raise HTTPException(status_code=422, detail=f"Source processing failed: {exc}")

    if extracted:
        chunks_data = chunk_extracted_content(
            extracted_items=extracted,
            document_id=doc.id,
            course_id=course_id,
            source_type=source_type
        )
        contents = [c["content"] for c in chunks_data]
        try:
            embeddings = generate_batch_embeddings(contents)
        except Exception as exc:
            repo.update_document_status(doc.id, "Failed", str(exc))
            raise HTTPException(status_code=503, detail=f"Semantic indexing failed: {exc}")
        for i, emb in enumerate(embeddings):
            chunks_data[i]["embedding"] = emb

        repo.add_chunks(chunks_data)
        # The conversation upload is the primary UI path, so it must populate
        # the same concept graph used by the tutoring planner.
        from app.knowledge.concept_extractor import extract_and_build_concept_graph
        extract_and_build_concept_graph(
            db=db, course_id=course_id, document_id=doc.id,
            extracted_items=extracted, source_type=source_type
        )
        repo.update_document_status(doc.id, "Completed")
    else:
        repo.update_document_status(doc.id, "Failed", "No content extracted")
        chunks_data = []

    repo.attach_document_to_conversation(conversation_id, doc.id)

    return {
        "status": "success",
        "document_id": doc.id,
        "title": doc.title,
        "source_type": doc.source_type,
        "chunks_count": len(chunks_data)
    }
