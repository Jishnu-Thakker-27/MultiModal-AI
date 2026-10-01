from typing import List, Dict, Any
from app.config import settings
import re

def chunk_extracted_content(
    extracted_items: List[Dict[str, Any]],
    document_id: str,
    course_id: str,
    source_type: str,
    chunk_size: int = None,
    chunk_overlap: int = None
) -> List[Dict[str, Any]]:
    """
    Configurable chunker that splits extracted page/slide/video text
    while preserving source metadata across every stage.
    """
    chunk_size = chunk_size or settings.CHUNK_SIZE
    chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP

    chunks = []
    global_chunk_index = 0

    for item in extracted_items:
        text = item.get("text", "")
        if not text:
            continue

        words = text.split()
        if len(words) <= chunk_size:
            word_chunks = [text]
        else:
            word_chunks = []
            start = 0
            while start < len(words):
                end = start + chunk_size
                chunk_words = words[start:end]
                word_chunks.append(" ".join(chunk_words))
                start += (chunk_size - chunk_overlap)

        for chunk_text in word_chunks:
            chunk_data = {
                "document_id": document_id,
                "course_id": course_id,
                "chunk_index": global_chunk_index,
                "content": chunk_text,
                "source_type": source_type,
                "page_number": item.get("page_number"),
                "slide_number": item.get("slide_number"),
                "start_time": item.get("start_time"),
                "end_time": item.get("end_time"),
                "topic": item.get("topic", "General"),
                "subtopic": item.get("subtopic", "General Overview"),
                "concept": item.get("concept", "Core Concept"),
            }
            chunks.append(chunk_data)
            global_chunk_index += 1

    return chunks
