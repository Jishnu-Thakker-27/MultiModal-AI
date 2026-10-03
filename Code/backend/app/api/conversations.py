import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
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
from app.rag.hierarchical_retriever import retrieve_hierarchical_chunks
from app.knowledge.graph_manager import GraphManager
from app.ingestion.pdf_processor import extract_pdf_content
from app.ingestion.ppt_processor import extract_pptx_content
from app.ingestion.video_processor import extract_video_content
from app.ingestion.chunker import chunk_extracted_content
from app.rag.embeddings import generate_batch_embeddings

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
        last_msg = msgs[-1]["created_at"] if msgs else c.updated_at
        res.append(ConversationResponse(
            id=c.id,
            title=c.title,
            course_id=c.course_id,
            topic_name=c.topic_name,
            status=c.status,
            message_count=len(msgs),
            last_message_at=last_msg,
            created_at=c.created_at,
            updated_at=c.updated_at,
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
        pedagogical_context = PrerequisiteResolver(db).resolve_pedagogical_context(
            course_id=conv.course_id or "default_course",
            user_id=user_id,
            query=question,
            intent=intent_info["intent"]
        )
        retrieved_chunks = retrieve_hierarchical_chunks(
            db=db,
            query=question,
            conversation_id=conv.id,
            intent=intent_info["intent"],
            target_concept=pedagogical_context.get("target_concept"),
            prerequisite_nodes=pedagogical_context.get("prerequisites"),
            is_introductory=pedagogical_context.get("is_introductory_request", True),
            top_k=5
        )
        teaching_plan = TeachingPlanner().create_plan(
            query=question,
            intent_info=intent_info,
            pedagogical_context=pedagogical_context,
            retrieved_chunks=retrieved_chunks
        )
        answer, citations, is_grounded = generate_grounded_answer(question, retrieved_chunks, teaching_plan)
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
        created_at=conv.created_at,
        updated_at=conv.updated_at,
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
    return ConversationResponse(
        id=conv.id,
        title=conv.title,
        course_id=conv.course_id,
        topic_name=conv.topic_name,
        status=conv.status,
        message_count=len(msgs),
        last_message_at=msgs[-1]["created_at"] if msgs else conv.updated_at,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
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
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    question = payload.question.strip()
    user_id = payload.user_id or "demo_student"
    
    # Auto-update conversation title if default
    if conv.title in ["New Chat", "New Learning Session", "Untitled Session"]:
        new_title = question[:35] + ("..." if len(question) > 35 else "")
        repo.update_conversation(conversation_id, title=new_title)
        
    # 1. Intent Classification
    intent_info = classify_learning_intent(question)
    
    # 2. Prerequisite & Concept Resolution
    pedagogical_context = PrerequisiteResolver(db).resolve_pedagogical_context(
        course_id=conv.course_id or "default_course",
        user_id=user_id,
        query=question,
        intent=intent_info["intent"]
    )
    
    # 3. Hierarchical RAG Retrieval
    retrieved_chunks = retrieve_hierarchical_chunks(
        db=db,
        query=question,
        conversation_id=conversation_id,
        course_id=conv.course_id,
        intent=intent_info["intent"],
        target_concept=pedagogical_context.get("target_concept"),
        prerequisite_nodes=pedagogical_context.get("prerequisites"),
        is_introductory=pedagogical_context.get("is_introductory_request", True),
        top_k=5
    )
    
    # 4. Teaching Planner
    teaching_plan = TeachingPlanner().create_plan(
        query=question,
        intent_info=intent_info,
        pedagogical_context=pedagogical_context,
        retrieved_chunks=retrieved_chunks
    )
    
    # 5. Grounded Tutor Response Generation
    answer, citations, is_grounded = generate_grounded_answer(question, retrieved_chunks, teaching_plan)
    
    # 6. Save Message History
    repo.save_chat_messages(conversation_id, question, answer, citations)
    
    # 7. Update Student Concept Mastery
    target_node = pedagogical_context.get("target_concept")
    if target_node:
        GraphManager(db).update_student_concept_mastery(user_id, target_node.id, delta=0.2)
    
    return ChatResponse(
        conversation_id=conversation_id,
        question=question,
        answer=answer,
        is_grounded=is_grounded,
        citations=citations
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
    
    # Process & chunk document immediately
    extracted = []
    if source_type == "pdf":
        extracted = extract_pdf_content(file_path)
    elif source_type == "pptx":
        extracted = extract_pptx_content(file_path)
    elif source_type == "video":
        extracted = extract_video_content(file_path)
        
    if extracted:
        chunks_data = chunk_extracted_content(
            extracted_items=extracted,
            document_id=doc.id,
            course_id=course_id,
            source_type=source_type
        )
        contents = [c["content"] for c in chunks_data]
        embeddings = generate_batch_embeddings(contents)
        for i, emb in enumerate(embeddings):
            chunks_data[i]["embedding"] = emb
            
        repo.add_chunks(chunks_data)
        repo.update_document_status(doc.id, "Completed")
    else:
        repo.update_document_status(doc.id, "Failed", "No content extracted")
        chunks_data = []
        
    # Attach to conversation
    repo.attach_document_to_conversation(conversation_id, doc.id)
    
    return {
        "status": "success",
        "document_id": doc.id,
        "title": doc.title,
        "source_type": doc.source_type,
        "chunks_count": len(chunks_data)
    }
