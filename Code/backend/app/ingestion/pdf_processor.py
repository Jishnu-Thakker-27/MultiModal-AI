import pymupdf as fitz
import os
import re
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

        full_text = "\n".join(text_blocks).strip()

        # Update running structural section hierarchy (e.g. Unit-4, Chapter 2, Section 3.1)
        sec_match = re.search(r'(Unit\s*[-:\d]+[^\n]*|Chapter\s*[-:\d]+[^\n]*|Section\s*[-:\d]+[^\n]*)', full_text, re.IGNORECASE)
        if sec_match:
            current_section = sec_match.group(1).strip()

        # 2. Table extraction
        table_text = ""
        has_tables = False
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

        # 3. Visual element detection & OCR fallback
        image_list = page.get_images()
        has_images = len(image_list) > 0
        figure_info = f"\n[Visual Element: Page contains {len(image_list)} diagram(s)/figure(s)]" if has_images else ""

        ocr_text = ""
        if has_images or len(full_text) < 100:
            try:
                import pytesseract
                from PIL import Image
                import io

                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes()))
                ocr_result = pytesseract.image_to_string(img).strip()
                if ocr_result and ocr_result.lower() not in full_text.lower():
                    ocr_text = f"\n[OCR Diagram/Image Text: {ocr_result}]"
                    logger.info(f"OCR extracted diagram text on page {actual_page}")
            except Exception as ocr_err:
                if len(full_text) < 20:
                    ocr_text = "\n[Visual Content: Scanned diagram/figure page]"
                logger.debug(f"OCR Renderer status on page {actual_page}: {ocr_err}")

        # 4. Mathematical content detection
        has_math = bool(re.search(r'(\\sum|\\int|\\sigma|\\alpha|\\beta|\\gamma|=|y\s*=\s*a|\^|\\\[|\\\(|\+|-|\*|/|matrix|least\s*squares)', full_text, re.IGNORECASE))

        # 5. Page Type Classification
        # Cover metadata detection: Page 1 with syllabus/course headers, low paragraph count
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

        # 6. Adaptive visual page rendering (PNG image generated for visual, math, scanned, or cover pages)
        visual_image_path = None
        if page_type in ["VISUAL_MATHEMATICAL", "SCANNED", "COVER_METADATA"]:
            try:
                pix = page.get_pixmap(dpi=150)
                img_filename = f"page_{actual_page}.png"
                img_dest = os.path.join(page_images_dir, img_filename)
                pix.save(img_dest)
                visual_image_path = img_dest
            except Exception as render_err:
                logger.debug(f"Page visual render status on page {actual_page}: {render_err}")

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
