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
    Semantic Page-Aware Chunker.
    Splits extracted page/slide/video text along semantic boundaries
    (paragraphs, headings, formulas, tables) while preserving document, page, and structural section metadata.
    """
    chunk_size = chunk_size or settings.CHUNK_SIZE
    chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP

    chunks = []
    global_chunk_index = 0

    for item in extracted_items:
        text = item.get("text", "")
        if not text:
            continue

        page_num = item.get("page_number")
        heading = item.get("heading") or f"Page {page_num}"
        section = item.get("section") or "General Overview"
        page_type = item.get("page_type") or ("COVER_METADATA" if page_num == 1 else "TEXT")

        # Split into semantic blocks (double newlines, section headers, tables)
        semantic_blocks = re.split(r'\n{2,}', text)
        semantic_blocks = [b.strip() for b in semantic_blocks if b.strip()]

        current_words = []
        current_chunks = []

        for block in semantic_blocks:
            b_words = block.split()
            if len(current_words) + len(b_words) <= chunk_size:
                current_words.extend(b_words)
            else:
                if current_words:
                    current_chunks.append(" ".join(current_words))
                    # Overlap retention
                    overlap_count = min(chunk_overlap, len(current_words))
                    current_words = current_words[-overlap_count:] + b_words
                else:
                    # Single large block exceeds chunk size
                    start = 0
                    while start < len(b_words):
                        end = start + chunk_size
                        current_chunks.append(" ".join(b_words[start:end]))
                        start += (chunk_size - chunk_overlap)
                    current_words = []

        if current_words:
            current_chunks.append(" ".join(current_words))

        if not current_chunks:
            current_chunks = [text]

        for idx, c_text in enumerate(current_chunks):
            chunk_data = {
                "document_id": document_id,
                "course_id": course_id,
                "chunk_index": global_chunk_index,
                "content": c_text,
                "source_type": source_type,
                "page_number": page_num,
                "page_end": page_num,
                "slide_number": item.get("slide_number"),
                "start_time": item.get("start_time"),
                "end_time": item.get("end_time"),
                "heading": heading,
                "section": section,
                "page_type": page_type,
                "topic": item.get("topic") or section,
                "subtopic": item.get("subtopic") or heading,
                "concept": item.get("concept") or heading,
            }
            chunks.append(chunk_data)
            global_chunk_index += 1

    return chunks
