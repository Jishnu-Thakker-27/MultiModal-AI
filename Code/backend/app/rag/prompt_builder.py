from typing import List, Dict, Any

SYSTEM_PROMPT = """You are an expert AI Study Companion & Pedagogical Tutor.
Your highest imperatives are:
1. PEDAGOGICAL TEACHING SEQUENCE: Explain foundational concepts clearly (Definitions, Notation, Formulas, Worked Examples).
2. SOURCE GROUNDING: Base every educational claim strictly on the provided CONTEXT.
3. CANONICAL CITATION FORMAT: DO NOT invent fake inline page numbers or textual source tags (such as "[Source: Page 21]" or "(Page X)") in your text response. The backend system automatically constructs and renders canonical source citations from verified document evidence.

TEACHING RULES:
- When explaining a concept, start with the definition, key notation, and formula before walking through worked examples.
- If the question is not covered in the context, explicitly state: "This topic is not covered in your uploaded course material."
"""

def build_grounded_prompt(query: str, chunks: List[Dict[str, Any]], teaching_plan: Dict[str, Any] = None) -> str:
    if not chunks:
        context_str = "No relevant course material chunks were found."
    else:
        context_blocks = []
        for idx, c in enumerate(chunks, 1):
            source_type = c.get('source_type', 'pdf')
            if source_type == 'pdf':
                loc_str = f"PDF Page {c.get('page_number')}"
            elif source_type == 'pptx':
                loc_str = f"PPT Slide {c.get('slide_number')}"
            elif source_type == 'video':
                loc_str = f"Video {c.get('start_time')}"

            context_blocks.append(
                f"[Source Chunk {idx}] Document: {c.get('document_title', 'Document')} | Section: {c.get('section', 'General')} | Location: {loc_str}\nContent: {c.get('content', '')}"
            )
        context_str = "\n\n".join(context_blocks)

    plan_str = ""
    if teaching_plan:
        plan_str = f"""TEACHING PLAN:
- Target Concept: {teaching_plan.get('target_name')}
- Stage: {teaching_plan.get('teaching_stage')}
"""

    user_prompt = f"""{plan_str}CONTEXT:
{context_str}

STUDENT QUESTION:
{query}

PEDAGOGICAL TUTOR RESPONSE:"""

    return user_prompt
