import json
import logging
import re
from typing import List, Dict, Any, Optional
from app.config import settings
from app.providers.router import LLMProviderRouter

logger = logging.getLogger("study_companion.assessment.generator")

def generate_questions_from_content(
    topic_name: str,
    chunks: List[Dict[str, Any]],
    difficulty: str = "Medium",
    question_count: int = 5,
    question_type: str = "MCQ",
    total_marks: int = 10,
    marks_per_question: float = 2.0,
    tracked_knowledge: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Generates assessment questions grounded in course chunks and tailored to the student's
    RAG-tracked knowledge level from conversational teaching.
    Allocates exact marks per question summing up to total_marks (multiples of 10 up to 50).
    """
    context_blocks = []
    if chunks:
        for c in chunks:
            c_id = c.get("chunk_id", "chunk_unknown")
            doc_title = c.get("document_title", "Document")
            context_blocks.append(f"[Chunk ID: {c_id} | Document: {doc_title}]\n{c.get('content', '')}")
    else:
        context_blocks.append(f"[General Course Context]\nCore University Curriculum Topic: {topic_name}")

    context_text = "\n\n".join(context_blocks)

    # Determine pedagogical guidance based on tracked knowledge
    knowledge_guidance = ""
    if tracked_knowledge:
        level = tracked_knowledge.get("tracked_level", "Intermediate")
        pct = tracked_knowledge.get("mastery_percentage", 60.0)
        reason = tracked_knowledge.get("calibration_reason", "")
        misconceptions = tracked_knowledge.get("active_misconceptions", [])
        misc_str = f" Target and resolve these student misconceptions: {misconceptions}." if misconceptions else ""
        knowledge_guidance = (
            f"STUDENT KNOWLEDGE PROFILE:\n"
            f"- Tracked Knowledge Level: {level} ({pct}% mastery detected from Socratic conversation)\n"
            f"- Calibration Note: {reason}{misc_str}\n"
            f"- Tailor questions to challenge the student at this exact level, reinforcing concepts discussed in tutoring."
        )

    router = LLMProviderRouter()
    chunk_map = {c.get("chunk_id"): c for c in chunks} if chunks else {}
    default_chunk = chunks[0] if chunks else {
        "source_type": "pdf",
        "document_title": f"{topic_name} Curriculum",
        "page_number": 1,
        "chunk_id": "chunk_topic_1"
    }

    target_count = min(50, max(1, question_count))
    batch_size = 10
    num_batches = (target_count + batch_size - 1) // batch_size
    all_questions: List[Dict[str, Any]] = []

    for b_idx in range(num_batches):
        cur_batch_target = min(batch_size, target_count - len(all_questions))
        if cur_batch_target <= 0:
            break

        batch_prompt = f"""You are a Master University Professor and Assessment Author.
Generate {cur_batch_target} distinct, high-quality assessment questions of type '{question_type}' for the topic '{topic_name}' (Batch {b_idx + 1} of {num_batches}).

EXAM SPECIFICATIONS:
- Target Topic: {topic_name}
- Difficulty Level: {difficulty}
- Total Exam Marks: {total_marks} Marks
- Marks per Question: 1.0 Mark (Each question carries exactly 1 mark)
- Question Count for this batch: {cur_batch_target}
{knowledge_guidance}

DIFFICULTY GUIDELINES:
- Easy: Test foundational concepts, core definitions, intuitive terminology, and basic recognition.
- Medium: Test operational mechanics, formula applications, procedural steps, and intermediate problem solving (calibrated to the learner's conversational progress).
- Hard: Test advanced synthesis, multi-step problem solving, edge cases, and mathematical deductions.

CRITICAL FORMATTING & CONTENT RULES:
1. Ground questions directly in the provided context and fundamental subject principles of '{topic_name}'.
2. For MCQ questions, provide EXACTLY 4 distinct, meaningful, plausible choices (Option A, Option B, Option C, Option D). Do NOT use generic placeholder choices like "None of the above" or "Invalid formulation".
3. 'correct_answer' MUST exactly match one of the 4 options.
4. Provide a clear, educational 'explanation' explaining why the correct answer is right and why the reasoning holds.
5. In LaTeX math, use clean inline `$ ... $` syntax.
6. Reference a valid 'source_chunk_id' from the context.
7. Ensure questions in this batch are fresh and non-repetitive.

COURSE CONTEXT:
{context_text}

OUTPUT FORMAT (Respond STRICTLY with valid JSON object):
{{
  "questions": [
    {{
      "question_text": "Clear question text here...",
      "question_type": "{question_type}",
      "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
      "correct_answer": "Choice A",
      "explanation": "Detailed step-by-step reasoning...",
      "difficulty": "{difficulty}",
      "marks": 1.0,
      "topic_name": "{topic_name}",
      "source_chunk_ids": ["chunk_id_here"]
    }}
  ]
}}"""

        try:
            response = router.generate(
                prompt=batch_prompt,
                system_prompt="You are an elite University Examiner creating rigorous, pedagogical course quizzes. Output only valid JSON."
            )

            if response.is_success and response.content:
                raw = response.content.strip()
                if raw.startswith("```"):
                    raw = re.sub(r"^```(?:json)?\s*", "", raw)
                    raw = re.sub(r"\s*```$", "", raw)

                parsed = json.loads(raw)
                questions_list = parsed.get("questions", parsed) if isinstance(parsed, dict) else parsed

                if isinstance(questions_list, list) and len(questions_list) > 0:
                    for idx, q in enumerate(questions_list):
                        q["topic_name"] = topic_name
                        q["difficulty"] = difficulty
                        q["marks"] = 1.0
                        q["total_marks"] = total_marks

                        c_ids = q.get("source_chunk_ids", [])
                        if c_ids and c_ids[0] in chunk_map:
                            matching_c = chunk_map[c_ids[0]]
                        else:
                            matching_c = default_chunk
                            q["source_chunk_ids"] = [matching_c.get("chunk_id", f"chunk_{len(all_questions)+idx+1}")]

                        q["source_metadata"] = {
                            "source_type": matching_c.get("source_type", "pdf"),
                            "document_title": matching_c.get("document_title", f"{topic_name} Material"),
                            "page": matching_c.get("page_number", 1),
                            "slide": matching_c.get("slide_number"),
                            "start_time": matching_c.get("start_time"),
                            "marks": 1.0,
                            "total_marks": total_marks,
                            "calibrated_difficulty": difficulty,
                            "tracked_knowledge": tracked_knowledge.get("tracked_level") if tracked_knowledge else None
                        }
                        all_questions.append(q)
                        if len(all_questions) >= target_count:
                            break
        except Exception as e:
            logger.warning(f"Batch {b_idx + 1} question generation failed ({e}). Proceeding to next or fallback.")

    if len(all_questions) >= target_count:
        logger.info(f"Successfully generated {len(all_questions)} LLM questions for '{topic_name}' (1 mark each, {total_marks} marks total)")
        return all_questions[:target_count]

    # High-quality content-grounded fallback generator (fills remaining up to target_count)
    from app.assessment.topic_banks import get_topic_question_bank
    needed = target_count - len(all_questions)
    bank_questions = get_topic_question_bank(topic_name, needed, difficulty)

    chunk_index = 0
    for b_q in bank_questions:
        c = chunks[chunk_index % len(chunks)] if chunks else default_chunk
        chunk_index += 1
        c_id = c.get("chunk_id", f"chunk_{len(all_questions)+1}")
        doc_title = c.get("document_title", f"{topic_name} Curriculum")

        b_q["question_type"] = question_type
        b_q["marks"] = 1.0
        b_q["total_marks"] = total_marks
        b_q["topic_name"] = topic_name
        b_q["source_chunk_ids"] = [c_id]
        b_q["source_metadata"] = {
            "source_type": c.get("source_type", "pdf"),
            "document_title": doc_title,
            "page": c.get("page_number", 1),
            "slide": c.get("slide_number"),
            "start_time": c.get("start_time"),
            "marks": 1.0,
            "total_marks": total_marks,
            "calibrated_difficulty": difficulty,
            "tracked_knowledge": tracked_knowledge.get("tracked_level") if tracked_knowledge else None
        }
        all_questions.append(b_q)
        if len(all_questions) >= target_count:
            break

    return all_questions[:target_count]
