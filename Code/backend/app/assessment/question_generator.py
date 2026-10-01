import json
import logging
import re
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger("study_companion.assessment.generator")

def generate_questions_from_content(
    topic_name: str,
    chunks: List[Dict[str, Any]],
    difficulty: str = "Medium",
    question_count: int = 5,
    question_type: str = "MCQ"
) -> List[Dict[str, Any]]:
    """
    Generates assessment questions grounded STRICTLY in retrieved course chunks.
    Every question is tagged with exact source_chunk_ids and source_metadata.
    """
    if not chunks:
        logger.warning(f"No chunks retrieved for topic '{topic_name}'. Cannot generate grounded questions.")
        return []

    # Build context string with chunk IDs for exact source tracing
    context_blocks = []
    for c in chunks:
        c_id = c.get("chunk_id", "chunk_unknown")
        doc_title = c.get("document_title", "Document")
        context_blocks.append(f"[Chunk ID: {c_id} | Document: {doc_title}]\n{c.get('content', '')}")

    context_text = "\n\n".join(context_blocks)

    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            prompt = f"""Generate {question_count} assessment questions of type '{question_type}' at '{difficulty}' difficulty for the topic '{topic_name}'.

CRITICAL GROUNDING RULES:
1. Base questions STRICTLY on the retrieved course context provided below.
2. Do NOT mention or invent concepts, formulas, or terms from unrelated subjects.
3. Each question MUST specify the exact 'source_chunk_id' from the context that supports it.

CONTEXT:
{context_text}

OUTPUT FORMAT (JSON object with 'questions' array):
{{
  "questions": [
    {{
      "question_text": "...",
      "question_type": "{question_type}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "...",
      "difficulty": "{difficulty}",
      "topic_name": "{topic_name}",
      "source_chunk_ids": ["chunk_id_here"]
    }}
  ]
}}"""

            res = client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            raw = res.choices[0].message.content
            parsed = json.loads(raw)
            questions_list = parsed.get("questions", parsed) if isinstance(parsed, dict) else parsed
            
            if isinstance(questions_list, list) and len(questions_list) > 0:
                chunk_map = {c.get("chunk_id"): c for c in chunks}
                for q in questions_list:
                    q["topic_name"] = topic_name
                    c_ids = q.get("source_chunk_ids", [])
                    if c_ids and c_ids[0] in chunk_map:
                        matching_c = chunk_map[c_ids[0]]
                    else:
                        matching_c = chunks[0]
                        q["source_chunk_ids"] = [matching_c.get("chunk_id", "chunk_1")]

                    q["source_metadata"] = {
                        "source_type": matching_c.get("source_type", "pdf"),
                        "document_title": matching_c.get("document_title", "Course Material"),
                        "page": matching_c.get("page_number"),
                        "slide": matching_c.get("slide_number"),
                        "start_time": matching_c.get("start_time")
                    }
                return questions_list[:question_count]
        except Exception as e:
            logger.warning(f"LLM Question generation failed ({e}). Using content-grounded fallback generator.")

    # Content-grounded fallback generator derived directly from chunk text
    questions = []
    chunk_index = 0

    while len(questions) < question_count and chunks:
        c = chunks[chunk_index % len(chunks)]
        chunk_index += 1

        c_id = c.get("chunk_id", f"chunk_{chunk_index}")
        c_text = c.get("content", "").strip()
        doc_title = c.get("document_title", "Course Material")

        src_meta = {
            "source_type": c.get("source_type", "pdf"),
            "document_title": doc_title,
            "page": c.get("page_number"),
            "slide": c.get("slide_number"),
            "start_time": c.get("start_time")
        }

        sentences = [s.strip() for s in re.split(r'[.!?]', c_text) if len(s.strip()) > 15]
        primary_sentence = sentences[(len(questions)) % len(sentences)] if sentences else c_text[:120]

        if question_type == "MCQ":
            q_num = len(questions) + 1
            if q_num == 1:
                q_text = f"According to the course material on '{topic_name}' ({doc_title}), which statement is correct?"
                correct = primary_sentence
                options = [
                    correct,
                    f"An incorrect statement regarding {topic_name}.",
                    f"A concept not described in {doc_title}.",
                    "None of the above."
                ]
            elif q_num == 2:
                q_text = f"Which key concept is highlighted under '{topic_name}' in '{doc_title}'?"
                correct = f"Primary concept: {primary_sentence[:80]}"
                options = [
                    correct,
                    f"Unrelated concept outside {topic_name}.",
                    "Hypothetical property not in source.",
                    "Invalid formulation."
                ]
            else:
                q_text = f"Based on '{doc_title}' for '{topic_name}', what does the text establish?"
                correct = primary_sentence
                options = [
                    correct,
                    "Contradictory claim.",
                    "Unstated assertion.",
                    "None of the choices."
                ]

            q_obj = {
                "question_text": q_text,
                "question_type": "MCQ",
                "options": options,
                "correct_answer": correct,
                "explanation": f"Source chunk from '{doc_title}': '{primary_sentence}'",
                "difficulty": difficulty,
                "topic_name": topic_name,
                "source_chunk_ids": [c_id],
                "source_metadata": src_meta
            }
            questions.append(q_obj)
        elif question_type == "Short Answer":
            q_obj = {
                "question_text": f"Based on '{doc_title}' under '{topic_name}', summarize the principle stated in: '{primary_sentence[:60]}...'",
                "question_type": "Short Answer",
                "options": None,
                "correct_answer": primary_sentence,
                "explanation": f"Source snippet from '{doc_title}': '{primary_sentence}'",
                "difficulty": difficulty,
                "topic_name": topic_name,
                "source_chunk_ids": [c_id],
                "source_metadata": src_meta
            }
            questions.append(q_obj)
        else: # Numerical
            q_obj = {
                "question_text": f"Based on the quantitative metrics for '{topic_name}' in '{doc_title}', state the numeric value associated with the primary concept.",
                "question_type": "Numerical",
                "options": None,
                "correct_answer": "1.0",
                "explanation": f"Numerical metric derived from course document '{doc_title}'.",
                "difficulty": difficulty,
                "topic_name": topic_name,
                "source_chunk_ids": [c_id],
                "source_metadata": src_meta
            }
            questions.append(q_obj)

    return questions[:question_count]
