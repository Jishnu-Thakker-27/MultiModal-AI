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
    DocumentResponse,
    HintLadderRequest,
    HintLadderResponse
)
from app.rag.retriever import retrieve_top_chunks
from app.rag.reranker import rerank_chunks
from app.rag.generator import generate_grounded_answer
from app.tutor.intent_classifier import classify_learning_intent
from app.tutor.prerequisite_resolver import PrerequisiteResolver
from app.tutor.teaching_planner import TeachingPlanner
from app.tutor.answer_validator import validate_tutor_response
from app.tutor.hint_ladder import generate_socratic_hint
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

def clean_chapter_name(title: str) -> str:
    if not title:
        return "Study Session"
    clean = re.sub(r'(\.(pdf|pptx|ppt|mp4|mov|webm|mkv|txt))+$', '', title, flags=re.I).strip()
    clean = re.sub(r'\s*-\s*', ' - ', clean)
    clean = clean.replace('_', ' ').strip()
    return clean

def clean_topic_name(title: str) -> str:
    """
    Extracts the substantive topic name by stripping chapter/unit/lecture/module prefixes.
    e.g. 'Chapter 6 - Numerical Solution of ODEs.pdf' -> 'Numerical Solution of ODEs'
    e.g. 'Chapter 2- Probability Distribution.pdf' -> 'Probability Distribution'
    """
    if not title:
        return "Course Material"
    name = clean_chapter_name(title)
    name = re.sub(r'^(?:chapter|lecture|unit|module|section|part)\s*\d+[\s\-_–:]*', '', name, flags=re.I).strip()
    return name if name else clean_chapter_name(title)

def is_generic_topic(topic: Optional[str]) -> bool:
    if not topic:
        return True
    t = topic.strip().lower()
    return t in ["general", "course material", "study session", "new study session", "none", "null", "untitled", ""]

def is_placeholder_title(title: Optional[str]) -> bool:
    if not title:
        return True
    t = title.strip().lower()
    placeholders = [
        "new study session", "new socratic inquiry", "new learning session",
        "new learning inquiry", "new conversation", "new chat", "untitled session",
        "general", "study session"
    ]
    return any(p == t or t.startswith("new ") for p in placeholders)

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
        
        resolved_title = c.title
        resolved_topic = c.topic_name
        if docs and docs[0].title:
            doc_topic = clean_topic_name(docs[0].title)
            if is_placeholder_title(resolved_title):
                resolved_title = clean_chapter_name(docs[0].title)
                repo.update_conversation(c.id, title=resolved_title)
            if is_generic_topic(resolved_topic):
                resolved_topic = doc_topic
                repo.update_conversation(c.id, topic_name=resolved_topic)
        elif not docs and is_generic_topic(resolved_topic) and not is_placeholder_title(resolved_title):
            resolved_topic = clean_topic_name(resolved_title)
            repo.update_conversation(c.id, topic_name=resolved_topic)

        res.append(ConversationResponse(
            id=c.id,
            title=resolved_title or "Study Session",
            course_id=c.course_id,
            topic_name=resolved_topic or "Course Material",
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
        learner_profile = repo.get_learner_profile(user_id=user_id, course_id=conv.course_id)
        resolved_student_name = payload.student_name if payload.student_name and payload.student_name.strip().lower() not in ["demo_student", "guest", "student", "jishnu", "default", "none"] else None
        if intent_info["intent"] in {"OVERVIEW", "DOCUMENT_SUMMARY"}:
            retrieved_chunks = retrieve_document_summary_chunks(db, conversation_id=conv.id, top_k=8)
            docs = repo.get_conversation_documents(conv.id)
            doc_title = "Uploaded Course Material"
            if docs and docs[0].title:
                clean_title = re.sub(r'\.(pdf|pptx|docx|txt)$', '', docs[0].title, flags=re.I)
                doc_title = re.sub(r'[-_–]', ' ', clean_title).strip()
            pedagogical_context = {"target_name": doc_title, "target_coverage_state": "STATE_C_SUFFICIENT_INFO", "learner_profile": learner_profile, "student_name": resolved_student_name}
            teaching_plan = TeachingPlanner().create_plan(question, intent_info, pedagogical_context, retrieved_chunks, tone="Intuitive Analogy", conversation_history=[])
        else:
            pedagogical_context = PrerequisiteResolver(db).resolve_pedagogical_context(
                course_id=conv.course_id or "default_course", user_id=user_id, query=question,
                intent=intent_info["intent"], conversation_id=conv.id
            )
            pedagogical_context["learner_profile"] = learner_profile
            pedagogical_context["student_name"] = resolved_student_name
            retrieved_chunks = retrieve_hierarchical_chunks(
                db=db, query=question, target_name=pedagogical_context.get("target_name"),
                conversation_id=conv.id, course_id=conv.course_id, intent=intent_info["intent"],
                query_scope=intent_info.get("query_scope", "FOCUSED"), target_concept=pedagogical_context.get("target_concept"),
                prerequisite_nodes=pedagogical_context.get("prerequisites"),
                is_introductory=pedagogical_context.get("is_introductory_request", True), top_k=5,
                user_id=user_id, learner_profile=learner_profile
            )
            teaching_plan = TeachingPlanner().create_plan(question, intent_info, pedagogical_context, retrieved_chunks, tone="Intuitive Analogy", conversation_history=[])
        raw_answer, citations, is_grounded = generate_grounded_answer(question, retrieved_chunks, teaching_plan, conversation_history=[])
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

    resolved_title = conv.title
    resolved_topic = conv.topic_name
    if documents and documents[0].title:
        doc_topic = clean_topic_name(documents[0].title)
        if is_placeholder_title(resolved_title):
            resolved_title = clean_chapter_name(documents[0].title)
            repo.update_conversation(conv.id, title=resolved_title)
        if is_generic_topic(resolved_topic):
            resolved_topic = doc_topic
            repo.update_conversation(conv.id, topic_name=resolved_topic)
    elif not documents and is_generic_topic(resolved_topic) and not is_placeholder_title(resolved_title):
        resolved_topic = clean_topic_name(resolved_title)
        repo.update_conversation(conv.id, topic_name=resolved_topic)

    return ConversationDetailResponse(
        id=conv.id,
        title=resolved_title or "Study Session",
        course_id=conv.course_id,
        topic_name=resolved_topic or "Course Material",
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
    tone = payload.tone or "Intuitive Analogy"

    if conv.title in ["New Chat", "New Learning Session", "Untitled Session", "New Socratic Inquiry", "New Learning Inquiry"]:
        new_title = question[:35] + ("..." if len(question) > 35 else "")
        repo.update_conversation(conversation_id, title=new_title)

    messages = repo.get_conversation_messages(conversation_id)

    # 1. Intent Classification
    intent_info = classify_learning_intent(question)

    learner_profile = repo.get_learner_profile(user_id=user_id, course_id=conv.course_id)

    # Check if student is answering the 3-hint initial diagnostic probe
    is_answering_probe = False
    if messages:
        for prev_m in reversed(messages):
            sender = prev_m.get("sender") or prev_m.get("role")
            if sender in ("assistant", "socratic-guide"):
                c_low = prev_m.get("content", "").lower()
                if any(term in c_low for term in ["how much do you know about", "first hint", "second hint", "third hint", "guiding hints", "let me know how much you know", "before we start the topic"]):
                    is_answering_probe = True
                break

    diagnosed_sync_score = None
    diagnosed_sync_level = None
    if is_answering_probe:
        q_low = question.lower()
        if any(w in q_low for w in ["completely new", "zero", "beginner", "no idea", "don't know", "never heard", "guide me step-by-step"]):
            diagnosed_sync_score = 0.25
            diagnosed_sync_level = "Beginner (Ground Zero)"
        elif any(w in q_low for w in ["understand the hints", "know this", "familiar", "safe", "rate of change", "already know"]):
            diagnosed_sync_score = 0.85
            diagnosed_sync_level = "Advanced (High Sync)"
        elif any(w in q_low for w in ["partial", "some idea", "little", "basics", "somewhat", "not quite sure"]):
            diagnosed_sync_score = 0.60
            diagnosed_sync_level = "Intermediate (Partial Sync)"
        elif "skip" in q_low:
            diagnosed_sync_score = 0.70
            diagnosed_sync_level = "Proficient (Direct Track)"
        else:
            diagnosed_sync_score = 0.65 if len(q_low.split()) > 5 else 0.45
            diagnosed_sync_level = "Developing Sync"


    # 2. Generalized Target & 3-State Coverage Resolution (Strictly scoped to this conversation's attached sources!)
    resolved_student_name = payload.student_name if payload.student_name and payload.student_name.strip().lower() not in ["demo_student", "guest", "student", "jishnu", "default", "none"] else None
    if intent_info["intent"] in {"OVERVIEW", "DOCUMENT_SUMMARY"}:
        docs = repo.get_conversation_documents(conversation_id)
        doc_title = "Uploaded Course Material"
        if docs and docs[0].title:
            clean_title = re.sub(r'\.(pdf|pptx|docx|txt)$', '', docs[0].title, flags=re.I)
            doc_title = re.sub(r'[-_–]', ' ', clean_title).strip()
        pedagogical_context = {"target_name": doc_title, "target_coverage_state": "STATE_C_SUFFICIENT_INFO", "learner_profile": learner_profile, "student_name": resolved_student_name}
        retrieved_chunks = retrieve_document_summary_chunks(db, conversation_id=conversation_id, top_k=8)
        teaching_plan = TeachingPlanner().create_plan(
            question, intent_info, pedagogical_context, retrieved_chunks, tone=tone, conversation_history=messages
        )
    else:
        pedagogical_context = PrerequisiteResolver(db).resolve_pedagogical_context(
            course_id=conv.course_id or "default_course", user_id=user_id, query=question,
            intent=intent_info["intent"], conversation_id=conversation_id, conversation_history=messages
        )
        pedagogical_context["learner_profile"] = learner_profile
        pedagogical_context["student_name"] = resolved_student_name

        # Ensure target_name stays locked to the active topic across conversational diagnostic turns
        resolved_target = pedagogical_context.get("target_name", "")
        if conv.topic_name and not is_generic_topic(conv.topic_name):
            if not resolved_target or is_generic_topic(resolved_target) or len(resolved_target.split()) > 3 or resolved_target.lower() in ["explain topic", "explain the topic", "the requested concept"]:
                pedagogical_context["target_name"] = conv.topic_name
        else:
            docs = repo.get_conversation_documents(conversation_id)
            if docs and docs[0].title:
                clean_title = clean_topic_name(docs[0].title)
                pedagogical_context["target_name"] = clean_title
                repo.update_conversation(conversation_id, topic_name=clean_title)
            elif not is_placeholder_title(conv.title):
                clean_title = clean_topic_name(conv.title)
                pedagogical_context["target_name"] = clean_title
                repo.update_conversation(conversation_id, topic_name=clean_title)
        if diagnosed_sync_score is not None:
            pedagogical_context["diagnosed_sync_score"] = diagnosed_sync_score
            pedagogical_context["diagnosed_sync_level"] = diagnosed_sync_level
        retrieved_chunks = retrieve_hierarchical_chunks(
            db=db, query=question, target_name=pedagogical_context.get("target_name"),
            conversation_id=conversation_id, course_id=conv.course_id, intent=intent_info["intent"],
            query_scope=intent_info.get("query_scope", "FOCUSED"), target_concept=pedagogical_context.get("target_concept"),
            prerequisite_nodes=pedagogical_context.get("prerequisites"),
            is_introductory=pedagogical_context.get("is_introductory_request", True), top_k=5,
            user_id=user_id, learner_profile=learner_profile
        )
        teaching_plan = TeachingPlanner().create_plan(
            question, intent_info, pedagogical_context, retrieved_chunks, tone=tone, conversation_history=messages
        )

    # 5. Grounded Tutor Response Generation (3-State Model with Conversation History)
    raw_answer, citations, is_grounded = generate_grounded_answer(
        question, retrieved_chunks, teaching_plan, conversation_history=messages
    )

    # 6. Final Answer Validation
    answer, citations = validate_tutor_response(raw_answer, pedagogical_context.get("target_name"), retrieved_chunks, citations)

    # 7. Save Message History
    repo.save_chat_messages(conversation_id, question, answer, citations)

    # 8. Update Student Concept Mastery & Track Learner Misconceptions
    target_node = pedagogical_context.get("target_concept")
    if target_node:
        confusion_signals = ["confused", "don't understand", "do not understand", "unclear", "explain again", "still stuck"]
        if any(w in question.lower() for w in confusion_signals):
            repo.record_misconception(
                user_id=user_id,
                concept_id=target_node.id,
                misconception_text=f"Struggling with concept '{target_node.name}': {question[:120]}",
                severity="moderate"
            )
        elif diagnosed_sync_score is not None:
            GraphManager(db).update_student_concept_mastery(user_id, target_node.id, delta=diagnosed_sync_score)
            logger.info(f"Recorded student '{user_id}' diagnostic sync for '{target_node.name}': {diagnosed_sync_score} ({diagnosed_sync_level})")
        else:
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
    clean_name = clean_chapter_name(doc.title)
    clean_topic = clean_topic_name(doc.title)
    update_data = {}
    if is_placeholder_title(conv.title):
        update_data["title"] = clean_name
    if is_generic_topic(conv.topic_name):
        update_data["topic_name"] = clean_topic
    if update_data:
        repo.update_conversation(conversation_id, **update_data)
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
    elif ext in ["mp4", "mov", "avi", "mkv", "webm", "m4v", "mp3", "wav", "m4a"]:
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
            extracted = extract_pdf_content(file_path, course_id=course_id, doc_id=doc.id)
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

    # Set conversation title and topic_name to the clean document/chapter name
    clean_name = clean_chapter_name(file.filename)
    clean_topic = clean_topic_name(file.filename)
    update_data = {}
    if is_placeholder_title(conv.title):
        update_data["title"] = clean_name
    if is_generic_topic(conv.topic_name):
        update_data["topic_name"] = clean_topic
    if update_data:
        repo.update_conversation(conversation_id, **update_data)

    return {
        "status": "success",
        "document_id": doc.id,
        "title": doc.title,
        "source_type": doc.source_type,
        "chunks_count": len(chunks_data)
    }

@router.post("/{conversation_id}/hint-ladder", response_model=HintLadderResponse)
def request_hint_ladder(
    conversation_id: str,
    payload: HintLadderRequest,
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    hint_data = generate_socratic_hint(
        db=db,
        conversation_id=conversation_id,
        problem_text=payload.problem_text,
        hint_level=payload.hint_level,
        student_attempt=payload.student_attempt,
        user_id=payload.user_id or "demo_student"
    )

    return HintLadderResponse(**hint_data)
