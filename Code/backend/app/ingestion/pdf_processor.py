import pymupdf as fitz
import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger("study_companion.ingestion.pdf")

def extract_pdf_content(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text page by page from a PDF document using PyMuPDF,
    preserving exact page numbers.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at {file_path}")

    pages_content = []
    doc = fitz.open(file_path)

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text").strip()
        if text:
            pages_content.append({
                "page_number": page_num + 1,
                "text": text,
            })

    doc.close()
    logger.info(f"Extracted {len(pages_content)} pages from PDF: {os.path.basename(file_path)}")
    return pages_content
