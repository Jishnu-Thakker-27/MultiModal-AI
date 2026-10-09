import logging
import re
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from app.database.repositories import Repository
from app.rag.hierarchical_retriever import retrieve_hierarchical_chunks
from app.rag.citation import extract_citations_from_chunks
from app.providers import llm_router
from app.rag.generator import format_sectional_citations

logger = logging.getLogger("study_companion.tutor.hint_ladder")

HINT_SYSTEM_PROMPT = r"""You are SocraticAI, a master university tutor who uses the Socratic Method and the "Hint Ladder" pedagogy.
Your mission is to guide students to solve mathematical and computer science problems themselves without giving away the answer immediately.

Follow the strict 4-stage Hint Ladder progression:
- Level 1 (Direction): Offer an intuitive nudge or perspective on the problem. Point to what given data to identify (e.g., arguments, entries, step sizes). NEVER reveal formulas, intermediate calculations, or final answers. Ask a guiding question to test their understanding.
- Level 2 (Method / Strategy): State the governing formula or algorithmic technique from the course context. Unpack what parameters need to be calculated first (e.g. parameter p = (x - x0)/h). Do NOT calculate the full result yet.
- Level 3 (Worked Intermediate Step): Demonstrate the first concrete calculation or table construction step. Substitute known values into the equation, but leave the final arithmetic/simplification for the student to attempt.
- Level 4 (Full Master Solution): Walk through the complete, rigorous step-by-step solution with clean LaTeX math ($...$ and isolated $$...$$), numerical verification, and key exam takeaways.

When evaluating a student's attempt:
Be encouraging, identify any specific misconception (e.g., sign error, indexing mistake, formula misuse) with surgical precision, and praise genuine effort.
"""

def generate_socratic_hint(
    db: Session,
    conversation_id: str,
    problem_text: str,
    hint_level: int = 1,
    student_attempt: Optional[str] = None,
    user_id: str = "demo_student"
) -> Dict[str, Any]:
    """
    Executes the Socratic Hint Ladder pedagogy for interactive problem-solving:
    - Level 1: Conceptual Direction & Nudge
    - Level 2: Method & Governing Formula
    - Level 3: Worked Intermediate Step
    - Level 4: Master Solution
    Also verifies student attempts with misconception diagnosis ('Explain-to-Earn').
    """
    repo = Repository(db)
    conv = repo.get_conversation(conversation_id)
    course_id = conv.course_id if conv else "default_course"

    # 1. Retrieve course evidence for this problem
    retrieved_chunks = retrieve_hierarchical_chunks(
        db=db,
        query=problem_text,
        target_name=None,
        conversation_id=conversation_id,
        course_id=course_id,
        intent="SOLVE_PROBLEM",
        top_k=4
    )
    citations = extract_citations_from_chunks(retrieved_chunks)

    context_str = ""
    if retrieved_chunks:
        context_parts = []
        for idx, c in enumerate(retrieved_chunks, 1):
            page_info = f"Page {c.get('page_number')}" if c.get('page_number') else "Document"
            context_parts.append(
                f"[Source {idx}] Document: {c.get('document_title', 'Course Material')} | {page_info}\n{c.get('content', '')}"
            )
        context_str = "\n\n".join(context_parts)
    else:
        context_str = "No specific textbook chunk retrieved."

    # 2. Build Prompt based on Hint Level & Student Attempt
    titles = {
        1: "💡 Hint 1: Conceptual Direction & Strategic Clue",
        2: "📐 Hint 2: Governing Method & Formula Strategy",
        3: "📝 Hint 3: Worked Intermediate Step & Verification",
        4: "🏆 Level 4: Complete Master Solution & Walkthrough"
    }
    title = titles.get(hint_level, f"💡 Hint {hint_level}")

    attempt_block = ""
    if student_attempt and student_attempt.strip():
        attempt_block = f"""
STUDENT'S SUBMITTED ATTEMPT OR EXPLANATION:
"{student_attempt.strip()}"

TASK:
1. First, provide constructive feedback on the student's attempt. Identify if their logic is correct, and if they made an error, diagnose the exact misconception (e.g. indexing mistake, sign error, or misunderstanding of parameters).
2. Then, provide the guidance for Hint Level {hint_level}.
"""

    level_instruction = ""
    if hint_level == 1:
        level_instruction = """
Provide HINT LEVEL 1 (Direction & Intuitive Nudge):
- Give a gentle, strategic mental model to approach this problem.
- Point out what initial variables or given values the student should identify first.
- DO NOT reveal any formulas, arithmetic, or the final answer!
- End with an explicit 'Guiding Question' encouraging the student to identify the first step.
"""
    elif hint_level == 2:
        level_instruction = """
Provide HINT LEVEL 2 (Method & Formula Strategy):
- Reveal the specific formula or theorem from the course material needed to solve this problem.
- Explain each variable in the formula in plain terms.
- Point out what intermediate tool (e.g., difference table) or parameter (e.g., p) is required.
- DO NOT perform the full numerical calculation yet.
- End with an explicit 'Guiding Question' asking the student to compute or substitute the first intermediate value.
"""
    elif hint_level == 3:
        level_instruction = """
Provide HINT LEVEL 3 (Worked Intermediate Step):
- Show the setup and first calculated step (e.g. the substituted formula or the constructed difference values).
- Walk through the intermediate calculation clearly.
- Stop just before the final answer and ask the student to complete the final algebraic sum/evaluation.
- End with an explicit 'Guiding Question' prompting them for the final evaluation.
"""
    else:
        level_instruction = """
Provide HINT LEVEL 4 (Complete Master Solution):
- Present the full, rigorous step-by-step master solution.
- Clearly label each step (Step 1: Setup, Step 2: Table / Intermediate Calculations, Step 3: Formula Substitution, Step 4: Final Evaluation).
- Include a quick sanity check and a key exam pro-tip or trap to avoid.
"""

    prompt = f"""COURSE MATERIAL EVIDENCE:
{context_str}

PROBLEM / EXERCISE TO SOLVE:
{problem_text}
{attempt_block}
{level_instruction}

FORMAT YOUR RESPONSE:
Provide a clear, pedagogical response using Markdown and clean LaTeX math ($...$ and isolated $$\\n...\\n$$).
Conclude with a clear:
**🤔 Guiding Question for You:**
<Your single targeted question for the student>
"""

    response = llm_router.generate(
        prompt=prompt,
        system_prompt=HINT_SYSTEM_PROMPT
    )

    content = ""
    guiding_question = None
    attempt_feedback = None

    if response.is_success:
        raw_text = response.content
        formatted = format_sectional_citations(raw_text)

        # Extract Guiding Question if present
        q_match = re.search(r'\*\*🤔\s*Guiding Question(?:\s*for You)?:\*\*\s*(.+)$', formatted, flags=re.I | re.DOTALL)
        if q_match:
            guiding_question = q_match.group(1).strip()
            # Remove guiding question from main content if desired, or keep both
        
        # If student attempt was submitted, extract feedback
        if student_attempt:
            attempt_feedback = "Your attempt has been reviewed by the Socratic tutor."

        content = formatted
    else:
        content = (
            f"Here is a guidance clue for this problem:\n\n"
            f"Start by identifying the given coordinates $(x_i, y_i)$ and check if the interval $h$ is uniform. "
            f"Recall the relationship between the target $x$ and the initial point $x_0$."
        )
        guiding_question = "What is the step size $h$ and initial value $x_0$ in this data?"

    can_reveal_solution = bool(student_attempt and student_attempt.strip()) or hint_level >= 3

    return {
        "conversation_id": conversation_id,
        "problem_text": problem_text,
        "hint_level": hint_level,
        "title": title,
        "content": content,
        "guiding_question": guiding_question,
        "next_allowed_level": min(hint_level + 1, 4),
        "can_reveal_solution": can_reveal_solution,
        "attempt_feedback": attempt_feedback,
        "citations": citations
    }
