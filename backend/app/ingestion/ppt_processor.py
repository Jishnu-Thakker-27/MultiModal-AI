import os
import logging
from pptx import Presentation
from typing import List, Dict, Any

logger = logging.getLogger("study_companion.ingestion.pptx")

def extract_pptx_content(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text, table contents, figure/diagram alt-text, and slide notes
    slide by slide from a PPTX file using python-pptx, preserving slide numbers.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PPTX file not found at {file_path}")

    slides_content = []
    prs = Presentation(file_path)

    for idx, slide in enumerate(prs.slides):
        slide_elements = []

        for shape in slide.shapes:
            # 1. Text frames
            if shape.has_text_frame:
                text = shape.text.strip()
                if text:
                    slide_elements.append(text)

            # 2. Table shapes
            if shape.has_table:
                table_cells = []
                for row in shape.table.rows:
                    row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_text:
                        table_cells.append(" | ".join(row_text))
                if table_cells:
                    slide_elements.append("[Table Content: " + " ; ".join(table_cells) + "]")

            # 3. Figure / diagram alt-text or shape title
            if hasattr(shape, 'title') and shape.title:
                slide_elements.append(f"[Diagram Title: {shape.title.strip()}]")
            if hasattr(shape, 'click_action') or hasattr(shape, 'description'):
                desc = getattr(shape, 'description', '')
                if desc and desc.strip():
                    slide_elements.append(f"[Figure Description: {desc.strip()}]")

        # 4. Slide notes if present
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
            notes = slide.notes_slide.notes_text_frame.text.strip()
            if notes:
                slide_elements.append(f"[Speaker Notes: {notes}]")

        full_slide_text = "\n".join(slide_elements).strip()
        if full_slide_text:
            slides_content.append({
                "slide_number": idx + 1,
                "text": full_slide_text
            })

    logger.info(f"Extracted {len(slides_content)} slides with tables and visual metadata from PPTX: {os.path.basename(file_path)}")
    return slides_content
