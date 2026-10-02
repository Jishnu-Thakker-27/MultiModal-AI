from typing import List, Dict, Any

def extract_citations_from_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Constructs normalized citation objects matching referenced retrieved chunks.
    """
    citations = []
    seen = set()

    for c in chunks:
        doc_title = c.get("document_title", "Document")
        source_type = c.get("source_type", "pdf")
        page = c.get("page_number")
        slide = c.get("slide_number")
        start_time = c.get("start_time")

        key = (doc_title, source_type, page, slide, start_time)
        if key not in seen:
            seen.add(key)
            citations.append({
                "source_type": source_type,
                "document_title": doc_title,
                "page": page,
                "slide": slide,
                "start_time": start_time,
                "end_time": c.get("end_time"),
                "file_url": c.get("file_url", ""),
                "excerpt": c.get("content", "")[:250]
            })

    return citations
