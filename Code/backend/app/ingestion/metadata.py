from typing import Dict, Any

def create_source_metadata(
    source_type: str,
    document_title: str,
    page: int = None,
    slide: int = None,
    start_time: str = None,
    end_time: str = None,
    excerpt: str = None
) -> Dict[str, Any]:
    """
    Creates standardized structured metadata object for citations and grounding.
    """
    return {
        "source_type": source_type,
        "document_title": document_title,
        "page": page,
        "slide": slide,
        "start_time": start_time,
        "end_time": end_time,
        "excerpt": excerpt[:200] if excerpt else None
    }
