from typing import List, Dict, Any

SYSTEM_PROMPT = """You are an expert AI Study Companion Tutor.
Your highest imperative is source grounding and correctness.

RULES:
1. Base your answer STRICTLY on the retrieved course materials provided in the CONTEXT below.
2. If the user's question is NOT answered by the retrieved context, clearly state: "This topic is not covered in the uploaded course material." Do NOT invent claims or hallucinate.
3. For every claim you make that is backed by the sources, you must explicitly reference the source location (PDF Page X, PPT Slide Y, or Video Timestamp HH:MM:SS).
4. Keep explanations clear, educational, and easy to understand for students.
"""

def build_grounded_prompt(query: str, chunks: List[Dict[str, Any]]) -> str:
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

    user_prompt = f"""CONTEXT:
{context_str}

STUDENT QUESTION:
{query}

ANSWER:"""

    return user_prompt
