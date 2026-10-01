import logging
from typing import List, Dict, Any, Tuple
from app.config import settings
from app.rag.prompt_builder import SYSTEM_PROMPT, build_grounded_prompt
from app.rag.citation import extract_citations_from_chunks

logger = logging.getLogger("study_companion.rag.generator")

def generate_grounded_answer(
    query: str,
    chunks: List[Dict[str, Any]]
) -> Tuple[str, List[Dict[str, Any]], bool]:
    """
    Generates a source-grounded answer using LLM API with fallback.
    Returns (answer_text, citations_list, is_grounded).
    """
    if not chunks:
        return (
            "This topic is not covered in the uploaded course material.",
            [],
            False
        )

    citations = extract_citations_from_chunks(chunks)
    prompt = build_grounded_prompt(query, chunks)

    # If OpenAI API Key is present, invoke LLM
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2
            )
            answer = response.choices[0].message.content.strip()
            return answer, citations, True
        except Exception as e:
            logger.warning(f"LLM API invocation failed ({e}). Using grounded rule-based synthesis.")

    # Rule-backed grounded synthesis fallback for demo without active key
    top_chunk = chunks[0]
    loc_str = ""
    if top_chunk['source_type'] == 'pdf':
        loc_str = f"Page {top_chunk.get('page_number') or 1}"
    elif top_chunk['source_type'] == 'pptx':
        loc_str = f"Slide {top_chunk.get('slide_number') or 1}"
    elif top_chunk['source_type'] == 'video':
        loc_str = f"Timestamp {top_chunk.get('start_time') or '00:00:00'}"

    synthesized_answer = (
        f"Based on course document '{top_chunk['document_title']}' ({loc_str}):\n\n"
        f"{top_chunk['content']}\n\n"
        f"This material directly addresses your question regarding '{query}'."
    )

    return synthesized_answer, citations, True
