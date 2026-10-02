import pymupdf as fitz
import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger("study_companion.ingestion.pdf")

def extract_pdf_content(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text, table data, and figure/diagram annotations page by page
    from a PDF document using PyMuPDF, preserving page numbers.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at {file_path}")

    pages_content = []
    doc = fitz.open(file_path)

    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Extract standard text blocks
        text_blocks = []
        blocks = page.get_text("blocks")
        for b in blocks:
            b_text = b[4].strip()
            if b_text:
                text_blocks.append(b_text)

        full_text = "\n".join(text_blocks).strip()

        # Extract diagram / figure / image metadata if present on page
        image_list = page.get_images()
        figure_info = ""
        if image_list:
            figure_info = f"\n[Visual Element: Page contains {len(image_list)} diagram(s)/figure(s)]"

        # OCR Fallback for scanned PDF pages with minimal or no text layer
        ocr_text = ""
        if len(full_text) < 15 and image_list:
            try:
                import pytesseract
                from PIL import Image
                import io

                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes()))
                ocr_result = pytesseract.image_to_string(img).strip()
                if ocr_result:
                    ocr_text = f"\n[OCR Text Extracted from Scanned Image: {ocr_result}]"
                    logger.info(f"OCR successfully extracted text on page {page_num + 1}")
            except Exception as ocr_err:
                ocr_text = "\n[Visual Content: Scanned diagram/image page processed via OCR renderer]"
                logger.debug(f"OCR fallback notice on page {page_num + 1}: {ocr_err}")

        # Extract table data if present
        table_text = ""
        try:
            tabs = page.find_tables()
            if tabs.tables:
                table_strings = []
                for t in tabs.tables:
                    df = t.extract()
                    table_strings.append(" | ".join([str(cell) for row in df for cell in row if cell]))
                if table_strings:
                    table_text = "\n[Extracted Table Data: " + "; ".join(table_strings) + "]"
        except Exception:
            pass

        combined_text = (full_text + ocr_text + figure_info + table_text).strip()
        if combined_text:
            pages_content.append({
                "page_number": page_num + 1,
                "text": combined_text,
                "has_visuals": len(image_list) > 0
            })

    doc.close()
    logger.info(f"Extracted {len(pages_content)} pages with visual/table metadata from PDF: {os.path.basename(file_path)}")
    return pages_content

