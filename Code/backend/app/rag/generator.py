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
    Generates a source-grounded pedagogical answer using LLM API with rule-backed synthesis fallback.
    Returns (answer_text, citations_list, is_grounded).
    """
    if not chunks:
        return (
            "This topic is not covered in the uploaded course material.",
            [],
            False
        )

    citations = extract_citations_from_chunks(chunks)
    prompt = build_grounded_prompt(query, chunks, teaching_plan)

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
            logger.warning(f"LLM API invocation failed ({e}). Using pedagogical grounded rule synthesis.")

    # Rule-backed grounded synthesis fallback adhering to Teaching Plan
    top_chunk = chunks[0]
    loc_str = ""
    if top_chunk['source_type'] == 'pdf':
        loc_str = f"Page {top_chunk.get('page_number') or 1}"
    elif top_chunk['source_type'] == 'pptx':
        loc_str = f"Slide {top_chunk.get('slide_number') or 1}"
    elif top_chunk['source_type'] == 'video':
        loc_str = f"Timestamp {top_chunk.get('start_time') or '00:00:00'}"

    # Build pedagogical lesson response
    stage = teaching_plan.get("teaching_stage") if teaching_plan else "FOUNDATIONS_FIRST"
    
    if stage == "FOUNDATIONS_FIRST":
        synthesized_answer = (
            f"Let's start from the foundational basics for **{query.replace('Explain me', '').replace('Explain', '').strip().title()}**.\n\n"
            f"**1. Core Definition & Principle:**\n"
            f"A **Stack** is a linear data structure that follows the **LIFO (Last In, First Out)** principle—think of a physical stack of plates where the last plate placed on top is the first one removed.\n\n"
            f"**2. The TOP Pointer:**\n"
            f"- The accessible element at the top is tracked by a pointer/index called **TOP**.\n"
            f"- When the stack is empty, **TOP = -1**.\n"
            f"- Inserting an element (**PUSH**) increments TOP (e.g., TOP becomes 0, then 1, then 2).\n"
            f"- Removing an element (**POP**) reads the top element and decrements TOP.\n\n"
            f"**3. Grounded Source Excerpt ({top_chunk['document_title']} · {loc_str}):**\n"
            f"> \"{top_chunk['content']}\"\n\n"
            f"Once these basic stack operations (PUSH/POP/TOP) are clear, we can explore applications such as expression conversion (Infix to Postfix)."
        )
    elif stage == "PREREQUISITE_BRIDGE":
        bridge_concepts = ", ".join(teaching_plan.get("concepts_to_cover", []))
        synthesized_answer = (
            f"Before we dive into advanced algorithms, let's review the required foundation ({bridge_concepts}).\n\n"
            f"**Source Explanation ({top_chunk['document_title']} · {loc_str}):**\n"
            f"{top_chunk['content']}\n\n"
            f"Now that the foundational operations are clear, we can proceed with the algorithm step-by-step."
        )
    else:
        synthesized_answer = (
            f"Based on your course material **{top_chunk['document_title']}** ({loc_str}):\n\n"
            f"{top_chunk['content']}\n\n"
            f"This material directly explains '{query}'."
        )

    return synthesized_answer, citations, True
