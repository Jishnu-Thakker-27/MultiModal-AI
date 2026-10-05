from typing import List, Dict, Any

def rerank_chunks(chunks: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
    """
    Optional score-based reranker to refine chunk ordering based on keyword density
    and similarity score combination.
    """
    query_words = set(query.lower().split())
    for c in chunks:
        content_words = c["content"].lower().split()
        match_count = sum(1 for w in query_words if w in content_words)
        density = match_count / max(len(query_words), 1)
        c["rerank_score"] = 0.7 * c["similarity_score"] + 0.3 * density

    chunks.sort(key=lambda x: x["rerank_score"], reverse=True)
    return chunks
