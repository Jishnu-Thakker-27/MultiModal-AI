from typing import List, Dict, Any

SYSTEM_PROMPT = """You are an expert AI Study Companion & Pedagogical Tutor.
Your highest imperatives are:
1. PEDAGOGICAL TEACHING SEQUENCE: Explain foundational concepts first (Definition, LIFO, TOP pointer, PUSH/POP) before moving to advanced applications (like Infix->Postfix conversion).
2. SOURCE GROUNDING: Base every educational claim strictly on the provided CONTEXT.
3. CITATION ACCURACY: Reference exact source locations (Page X, Slide Y, Timestamp HH:MM:SS).

TEACHING RULES:
- When a student asks to "Explain" or "Teach" a concept, start with the core definition, key principle, and basic operations before introducing complex algorithms or applications.
- If a Teaching Plan is provided, structure your explanation according to the plan.
- If the question is not covered in the context, explicitly state: "This topic is not covered in the uploaded course material."
"""

def build_grounded_prompt(query: str, chunks: List[Dict[str, Any]], teaching_plan: Dict[str, Any] = None) -> str:
    if not chunks:
        context_str = "No relevant course material chunks were found."
    else:
        context_blocks = []
        for idx, c in enumerate(chunks, 1):
            loc_str = ""
            if c['source_type'] == 'pdf':
                loc_str = f"PDF Page {c.get('page_number')}"
            elif c['source_type'] == 'pptx':
                loc_str = f"PPT Slide {c.get('slide_number')}"
            elif c['source_type'] == 'video':
                loc_str = f"Video {c.get('start_time')}"

            context_blocks.append(
                f"[Source Chunk {idx}] Document: {c['document_title']} | Location: {loc_str}\nContent: {c['content']}"
            )
        context_str = "\n\n".join(context_blocks)

    plan_str = ""
    if teaching_plan:
        plan_str = f"""TEACHING PLAN:
- Stage: {teaching_plan.get('teaching_stage')}
- Sequence to cover: {', '.join(teaching_plan.get('concepts_to_cover', []))}
"""

    user_prompt = f"""{plan_str}CONTEXT:
{context_str}

STUDENT QUESTION:
{query}

PEDAGOGICAL TUTOR RESPONSE:"""

    return user_prompt
