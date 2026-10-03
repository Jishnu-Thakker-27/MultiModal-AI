import logging
from typing import List, Dict, Any, Tuple
from app.config import settings
from app.rag.prompt_builder import SYSTEM_PROMPT, build_grounded_prompt
from app.rag.citation import extract_citations_from_chunks

logger = logging.getLogger("study_companion.rag.generator")

def generate_grounded_answer(
    query: str,
    chunks: List[Dict[str, Any]],
    teaching_plan: Dict[str, Any] = None
) -> Tuple[str, List[Dict[str, Any]], bool]:
    """
    Topic-Agnostic Source-Grounded Answer Generator.
    Synthesizes answers strictly around the user's requested target concept.
    Returns (answer_text, citations_list, is_grounded).
    """
    target_name = teaching_plan.get("target_name") if teaching_plan else query
    target_found = teaching_plan.get("target_found", True) if teaching_plan else True

    # 1. Handle Target Not Found
    if not target_found:
        related_titles = set([c.get("document_title", "Course Material") for c in chunks])
        rel_str = f" Related concepts in course material: {', '.join(list(related_titles)[:2])}." if related_titles else ""
        return (
            f"The topic '**{target_name}**' was not found in the uploaded course material.{rel_str}",
            [],
            False
        )

    if not chunks:
        return (
            f"No source material was found in the course for '**{target_name}**'.",
            [],
            False
        )

    citations = extract_citations_from_chunks(chunks)

    # 2. Invoke LLM if OpenAI Key is configured
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            prompt = build_grounded_prompt(query, chunks, teaching_plan)
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
            logger.warning(f"LLM API invocation failed ({e}). Using topic-agnostic grounded rule synthesis.")

    # 3. Topic-Agnostic Grounded Synthesis Fallback
    top_chunk = chunks[0]
    loc_str = ""
    if top_chunk['source_type'] == 'pdf':
        loc_str = f"Page {top_chunk.get('page_number') or 1}"
    elif top_chunk['source_type'] == 'pptx':
        loc_str = f"Slide {top_chunk.get('slide_number') or 1}"
    elif top_chunk['source_type'] == 'video':
        loc_str = f"Timestamp {top_chunk.get('start_time') or '00:00:00'}"

    stage = teaching_plan.get("teaching_stage") if teaching_plan else "DIRECT_EXPLANATION"
    concepts = teaching_plan.get("concepts_to_cover", []) if teaching_plan else []

    synthesized_answer = (
        f"**{target_name}**\n\n"
        f"Based on your course material **{top_chunk['document_title']}** ({loc_str}):\n\n"
        f"> \"{top_chunk['content']}\"\n\n"
        f"**Key Explanation:**\n"
        f"The course material presents **{target_name}** as detailed above. "
        f"If you would like to explore specific operations, examples, or practice questions on **{target_name}**, let me know!"
    )

    return synthesized_answer, citations, True
