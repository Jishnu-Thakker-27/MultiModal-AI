from typing import List, Dict, Any

def extract_citations_from_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Constructs normalized evidence-based citation objects from retrieved chunks actually used in answer synthesis.
    Supports single pages ("Page 26") and page ranges ("pp. 26-27").
    """
    citations = []
    seen = set()

    for c in chunks:
        doc_title = c.get("document_title", "Document")
        doc_id = c.get("document_id")
        chunk_id = c.get("chunk_id")
        source_type = c.get("source_type", "pdf")
        page_start = c.get("page_number")
        page_end = c.get("page_end") or page_start
        slide = c.get("slide_number")
        start_time = c.get("start_time")

        key = (doc_title, source_type, page_start, page_end, slide, start_time)
        if key not in seen:
            seen.add(key)
            page_str = ""
            if page_start:
                if page_end and page_end > page_start:
                    page_str = f"pp. {page_start}–{page_end}"
                else:
                    page_str = f"Page {page_start}"

            citations.append({
                "document_id": doc_id,
                "chunk_id": chunk_id,
                "source_type": source_type,
                "document_title": doc_title,
                "page": page_start,
                "page_end": page_end,
                "page_label": page_str,
                "slide": slide,
                "start_time": start_time,
                "end_time": c.get("end_time"),
                "file_url": c.get("file_url") or (f"/api/documents/{doc_id}/file" if doc_id else ""),
                "section": c.get("section", ""),
                "heading": c.get("heading", ""),
                "excerpt": c.get("content", "")[:250]
            })

    return citations
