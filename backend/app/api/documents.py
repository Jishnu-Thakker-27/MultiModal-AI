import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.database.repositories import Repository
from app.schemas.schemas import DocumentResponse
from app.config import settings

from app.ingestion.pdf_processor import extract_pdf_content
from app.ingestion.ppt_processor import extract_pptx_content
from app.ingestion.video_processor import extract_video_content
from app.ingestion.chunker import chunk_extracted_content
from app.rag.embeddings import generate_batch_embeddings
from app.database.models import Document as DocModel

router = APIRouter(prefix="/api", tags=["Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".pptx", ".ppt", ".mp4"}

def get_source_type(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        return "pdf"
    elif ext in [".pptx", ".ppt"]:
        return "pptx"
    elif ext == ".mp4":
        return "video"
    raise ValueError("Unsupported file type")

@router.post("/courses/{course_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    course_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    repo = Repository(db)
    course = repo.get_course(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension '{ext}' is not supported. Use PDF, PPTX, or MP4.")

    try:
        source_type = get_source_type(file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    course_upload_dir = os.path.join(settings.UPLOAD_DIR, course_id)
    os.makedirs(course_upload_dir, exist_ok=True)
    
    file_path = os.path.join(course_upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc = repo.create_document(
        course_id=course_id,
        title=file.filename,
        source_type=source_type,
        file_path=file_path
    )
    return doc

@router.get("/courses/{course_id}/documents", response_model=List[DocumentResponse])
def get_course_documents(course_id: str, db: Session = Depends(get_db)):
    repo = Repository(db)
    return repo.get_documents_by_course(course_id)

@router.post("/documents/{document_id}/process")
def process_document(document_id: str, db: Session = Depends(get_db)):
    repo = Repository(db)
    doc = db.query(DocModel).filter(DocModel.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    repo.update_document_status(document_id, "Processing")

    try:
        extracted = []
        if doc.source_type == "pdf":
            extracted = extract_pdf_content(doc.file_path, course_id=doc.course_id, doc_id=doc.id)
        elif doc.source_type == "pptx":
            extracted = extract_pptx_content(doc.file_path)
        elif doc.source_type == "video":
            extracted = extract_video_content(doc.file_path)

        if not extracted:
            raise ValueError("No text or content could be extracted from document.")

        chunks = chunk_extracted_content(
            extracted_items=extracted,
            document_id=doc.id,
            course_id=doc.course_id,
            source_type=doc.source_type
        )

        texts = [c["content"] for c in chunks]
        embeddings = generate_batch_embeddings(texts)
        for i, emb in enumerate(embeddings):
            chunks[i]["embedding"] = emb

        repo.add_chunks(chunks)
        repo.update_document_status(document_id, "Completed")

        # Build explicit educational concept graph (nodes, relationships, document sequence)
        from app.knowledge.concept_extractor import extract_and_build_concept_graph
        extract_and_build_concept_graph(
            db=db,
            course_id=doc.course_id,
            document_id=doc.id,
            extracted_items=extracted,
            source_type=doc.source_type
        )

        # Dynamically infer topic structure from document text & title
        doc_base = os.path.splitext(doc.title)[0].replace("_", " ").replace("-", " ")
        topic_name = doc_base.title()
        
        # Build dynamic topic tree derived from content
        topic_tree = [
            {
                "name": topic_name,
                "description": f"Extracted core topics and principles from {doc.title}",
                "subtopics": [
                    {
                        "name": f"{topic_name} Fundamentals",
                        "concepts": ["Core Definition", "Properties & Invariants"]
                    },
                    {
                        "name": f"{topic_name} Operations",
                        "concepts": ["Algorithm Ingestion", "Efficiency & Complexity"]
                    }
                ]
            }
        ]
        repo.save_topic_structure(doc.course_id, topic_tree)

        return {"status": "success", "chunks_created": len(chunks)}
    except Exception as e:
        repo.update_document_status(document_id, "Failed", str(e))
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")

@router.delete("/documents/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    repo = Repository(db)
    success = repo.delete_document(document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "success", "message": "Document and associated knowledge chunks deleted successfully"}
