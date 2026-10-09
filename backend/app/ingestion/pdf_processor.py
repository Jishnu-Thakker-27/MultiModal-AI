import pymupdf as fitz
import os
import re
import unicodedata
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("study_companion.ingestion.pdf")

def validate_pdf_file(file_path: str) -> Dict[str, Any]:
    """
    Validates PDF file integrity, encryption status, and page count.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at {file_path}")

    try:
        doc = fitz.open(file_path)
    except Exception as e:
        raise ValueError(f"Invalid or corrupted PDF file: {str(e)}")

    if doc.is_encrypted:
        doc.close()
        raise ValueError("PDF is password-protected or encrypted.")

    page_count = len(doc)
    doc.close()
    return {
        "is_valid": True,
        "page_count": page_count,
        "file_name": os.path.basename(file_path)
    }

def extract_pdf_content(
    file_path: str,
    course_id: str = "default_course",
    doc_id: str = "doc_default"
) -> List[Dict[str, Any]]:
    """
    Page-Aware PDF & Document Understanding Engine.
    Extracts text, table data, diagram OCR text, visual metadata, and structural section hierarchy.
    Adaptively renders PNG visual page representations for visual/math/scanned pages.
    """
    validation = validate_pdf_file(file_path)
    page_count = validation["page_count"]

    pages_content = []
    doc = fitz.open(file_path)

    # Directory for rendered page visual representations
    page_images_dir = os.path.join(os.path.dirname(file_path), "pages", doc_id)
    os.makedirs(page_images_dir, exist_ok=True)

    current_section = "General Overview"

    for page_num in range(page_count):
        page = doc[page_num]
        actual_page = page_num + 1

        # 1. Extract text blocks and detect structural section/heading
        text_blocks = []
        blocks = page.get_text("blocks")
        first_heading = ""

        for idx, b in enumerate(blocks):
            b_text = b[4].strip()
            if b_text:
                text_blocks.append(b_text)
                if not first_heading and len(b_text) > 3:
                    first_heading = b_text.split('\n')[0].strip()

        full_text = unicodedata.normalize('NFKD', "\n".join(text_blocks)).strip()

        # Update running structural section hierarchy (e.g. Unit-4, Chapter 2, Section 3.1)
        sec_match = re.search(r'(Unit\s*[-:\d]+[^\n]*|Chapter\s*[-:\d]+[^\n]*|Section\s*[-:\d]+[^\n]*)', full_text, re.IGNORECASE)
        if sec_match:
            current_section = sec_match.group(1).strip()

        # 2. Table extraction (only run when structural table patterns or delimiters exist in page text)
        table_text = ""
        has_tables = False
        has_tabular_patterns = (
            "\t" in full_text
            or "|" in full_text
            or any(k in full_text.lower() for k in ["table", "s.no", "sl.no", "value of x", "col 1", "column 1", "data:"])
        )
        if has_tabular_patterns:
            try:
                tabs = page.find_tables()
                if tabs.tables:
                    has_tables = True
                    table_strings = []
                    for t in tabs.tables:
                        df = t.extract()
                        table_strings.append(" | ".join([str(cell) for row in df for cell in row if cell]))
                    if table_strings:
                        table_text = "\n[Extracted Table Data:\n" + "\n".join(table_strings) + "]"
            except Exception as t_err:
                logger.debug(f"Table extraction notice on page {actual_page}: {t_err}")

        # 3. Visual element detection & OCR fallback (only for purely scanned pages with almost zero text)
        image_list = page.get_images()
        has_images = len(image_list) > 0
        figure_info = f"\n[Visual Element: Page contains {len(image_list)} diagram(s)/figure(s)]" if has_images else ""

        ocr_text = ""
        # Only run expensive OCR if native digital text extraction found almost nothing (< 40 characters)
        if len(full_text) < 40 and has_images:
            try:
                import pytesseract
                from PIL import Image
                import io

                pix = page.get_pixmap(dpi=100)
                img = Image.open(io.BytesIO(pix.tobytes()))
                ocr_result = pytesseract.image_to_string(img).strip()
                if ocr_result:
                    ocr_text = f"\n[OCR Scanned Text: {ocr_result}]"
                    logger.info(f"OCR extracted scanned text on page {actual_page}")
            except Exception as ocr_err:
                ocr_text = "\n[Visual Content: Scanned diagram/figure page]"
                logger.debug(f"OCR Renderer status on page {actual_page}: {ocr_err}")

        # 4. Mathematical content detection
        has_math = bool(re.search(r'(\\sum|\\int|\\sigma|\\alpha|\\beta|\\gamma|=|y\s*=\s*a|\^|\\\[|\\\(|\+|-|\*|/|matrix|least\s*squares)', full_text, re.IGNORECASE))

        # 5. Page Type Classification
        is_cover_page = False
        if actual_page == 1 or (page_num < 2 and re.search(r'(syllabus|course\s*code|unit-\d+|department\s*of|university|credits)', full_text, re.IGNORECASE) and len(full_text.split('\n')) < 15):
            is_cover_page = True

        if is_cover_page:
            page_type = "COVER_METADATA"
        elif has_images or has_tables or has_math:
            page_type = "VISUAL_MATHEMATICAL"
        elif len(full_text) < 100:
            page_type = "SCANNED"
        else:
            page_type = "TEXT"

        # 6. Page visual path (Native browser PDF viewer serves pages directly without heavy disk rasterization)
        visual_image_path = None

        combined_text = (full_text + ocr_text + figure_info + table_text).strip()
        if not combined_text:
            combined_text = f"[Page {actual_page} Content]"

        pages_content.append({
            "document_id": doc_id,
            "course_id": course_id,
            "page_number": actual_page,
            "text": combined_text,
            "raw_text": full_text,
            "heading": first_heading or f"Page {actual_page}",
            "section": current_section,
            "has_visuals": has_images,
            "has_tables": has_tables,
            "has_math": has_math,
            "page_type": page_type,
            "visual_image_path": visual_image_path
        })

    doc.close()
    logger.info(f"Extracted {len(pages_content)} page objects from PDF: {os.path.basename(file_path)}")
    return pages_content
