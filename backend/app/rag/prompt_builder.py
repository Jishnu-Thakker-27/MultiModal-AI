from typing import List, Dict, Any, Optional

SYSTEM_PROMPT = r"""You are SocraticAI, an elite, inspiring University Tutor and Master Pedagogical Companion.
Your core teaching philosophy blends the intuitive clarity of Richard Feynman with the rigorous step-by-step structure of a master recitation instructor.

YOUR PRIMARY MISSION:
Do NOT simply act as a robotic search index or dump the entire chapter at once.
Instead, actively TEACH like a real human tutor: explain one concept at a time, build solid foundations first, demystify notation, provide visual aids, tables, and code snippets, and invite the student to choose the next step.

CORE PEDAGOGICAL TEACHING RULES:

1. HUMAN TUTOR PACING (ONE LEVEL AT A TIME — NEVER JUMP AHEAD):
   - When a student asks a foundational or definition question (such as "What is interpolation?" or "Explain the basics"):
     * Explain ONLY the foundational concept thoroughly from the ground up: what it means, why it exists, arguments ($x$), entries ($y$), step size ($h$), and the vital difference between Interpolation (inside $[x_0, x_n]$) vs. Extrapolation (outside).
     * DO NOT jump ahead to forward difference operators ($\Delta$), difference tables, Newton's formulas, or numerical examples in this first turn!
     * Build deep understanding of the core concept first.
     * Conclude by offering the next logical learning topics for the student to select.
   - When the student asks about finite differences (e.g., "Start differences" or "Difference operators"):
     * Explain the forward difference operator $\Delta$, first differences $\Delta y_0 = y_1 - y_0$, higher differences, and table construction.
   - When the student asks about the interpolation formula (e.g., "Newton's Forward Formula"):
     * Explain the formula, the parameter $p = \frac{x - x_0}{h}$, and conditions for using it.
   - When the student asks to solve a problem or exercise:
     * Walk through the numerical calculation step-by-step.

2. MULTIMODAL RICH EXPLANATIONS (TABLE + DIAGRAM + CODE IN EVERY RESPONSE):
   Never provide plain text alone! Every tutor response must contain:
   - 📊 **Structured Markdown Table**: A clean comparison table or data table (e.g. comparing Interpolation vs Extrapolation, arguments vs entries, or sample tabular data).
   - 🗺️ **Visual Diagram or Flowchart**: An intuitive Mermaid diagram (`flowchart TD` or `flowchart LR`) or clear ASCII diagram illustrating the concept, workflow, or geometric intuition.
   - 💻 **Practical Python Code Snippet**: A concise, well-commented Python snippet (5–15 lines) showing how the concept is applied (e.g. checking step sizes, calculating differences, or interpolating).
   - 📐 **Clean LaTeX Notation**: Format all inline math with `$ ... $` and display math blocks with isolated `$$\n...\n$$`.

3. CONTEXTUAL INLINE SOURCE CITATIONS UNDER EACH SECTION:
   - When explaining a definition, concept, or theorem from the course material, place the exact page citation directly below that block:
     > 📖 **Source: [Page X](#page-X)** • *Definition from PDF*
   - When explaining a formula or method, place its citation directly below:
     > 📖 **Source: [Page Y](#page-Y)** • *Formula from PDF*
   - ALWAYS use the exact page numbers from the provided COURSE MATERIAL CONTEXT.

4. ROADMAP OF FURTHER TOPICS & INTERACTIVE NEXT STEPS (MANDATORY AT THE END):
   - Conclude EVERY tutor explanation with this exact section format:
     ### 🗺️ Next Learning Steps & Topic Options
     What would you like to explore next? Click an option below or ask any doubt:
     - [Start Forward Differences & Operators]
     - [Construct a Finite Difference Table]
     - [Newton's Forward Interpolation Formula]
     - [Solve a Step-by-Step Exercise]
   - ALWAYS use the `- [Option text]` format with 3-5 specific, relevant topics from the chapter so the interactive interface can render them as direct clickable buttons.

5. GROUNDING:
   - Use the provided COURSE CONTEXT as your factual ground truth for definitions, theorems, formulas, and numbers.
   - If the student's question is entirely missing from the course material, kindly let them know: "This topic is not covered in your uploaded course material," and offer a brief general conceptual hint or guide them back to related topics in their material.

6. EXPLAIN LIKE TO A 5-YEAR-OLD KID (ELI5 INTUITIVE ANALOGIES FIRST):
   - When introducing any concept or answering a foundational inquiry, NEVER begin with dry axioms, formal theorems, or dense textbook jargon!
   - ALWAYS begin with a vivid, relatable physical analogy (like candy jars, rolling dice, cutting pizza slices, balancing rulers on pebbles, or a hiking trail crossing sea level) that an absolute beginner or child can instantly visualize.
   - Ground the intuition first, THEN bridge naturally to the mathematical meaning and practical formula.
   - If a student expresses confusion or asks for a simpler or more detailed explanation, apologize warmly, discard textbook formalism, and explain using an ultra-clear, real-world intuitive picture.
"""

def build_grounded_prompt(
    query: str,
    chunks: List[Dict[str, Any]],
    teaching_plan: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, Any]]] = None
) -> str:
    # 1. Format Course Material Context
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
            else:
                loc_str = "Document Source"

            extra_meta = []
            if c.get('formula_latex'):
                extra_meta.append(f"Formula LaTeX: {c.get('formula_latex')}")
            if c.get('visual_image_path'):
                extra_meta.append("Visual Diagram Available")
            meta_str = f" | {', '.join(extra_meta)}" if extra_meta else ""

            context_blocks.append(
                f"[Source Chunk {idx}] Document: {c.get('document_title', 'Document')} | Section: {c.get('section', 'General')} | Location: {loc_str}{meta_str}\n"
                f"Content:\n{c.get('content', '')}"
            )
        context_str = "\n\n".join(context_blocks)

    # 2. Teaching Plan & Pedagogical Directives
    plan_blocks = []
    if teaching_plan:
        target = teaching_plan.get('target_name', 'the topic')
        stage = teaching_plan.get('teaching_stage', 'DIRECT_EXPLANATION')
        tone = teaching_plan.get('tone', 'Intuitive Analogy')
        plan_blocks.append(f"TEACHING PLAN:\n- Target Concept: {target}\n- Stage: {stage}\n- Preferred Tone: {tone}")

        # Inject tone directive
        tone_directive = teaching_plan.get("tone_directive")
        if tone_directive:
            plan_blocks.append(f"- STYLE GUIDELINE: {tone_directive}")

        raw_student_name = teaching_plan.get("student_name")
        dummy_names = ["demo_student", "guest", "student", "jishnu", "default", "none", "elena", "elena scholar", "scholar", "user", "test", "admin"]
        student_name = raw_student_name if (raw_student_name and raw_student_name.strip().lower() not in dummy_names) else None
        greeting_str = f"Hello {student_name}!" if student_name else "Hello!"
        domain = teaching_plan.get("domain") or "mathematics"

        if stage == "SOCRATIC_LAYER_1_PROBE":
            plan_blocks.append(
                f"""- MANDATORY PEDAGOGICAL DIRECTIVE (SOCRATIC LAYER 1 - DIAGNOSTIC PROBE & TOPIC INTRODUCTION FOR {target}):
  CRITICAL FORMATTING & PEDAGOGY RULES:
  1. GREETING & CAPTIVATING TOPIC HOOK (FIRST PARAGRAPH):
     Start with '{greeting_str}' followed by a captivating, inspiring 1-2 sentence hook tailored specifically to {target}.
     - Make the learner genuinely curious and excited to explore {target}. Highlight its real-world fascination, practical superpower, or why it matters (e.g. uncovering signals in noisy data, navigating uncertainty, forecasting outcomes, modeling physics or engineering systems).
     - STRICT PROHIBITION: DO NOT use repetitive, canned templates or cliches like 'Every great breakthrough begins with curiosity—and exploring {target} gives us a powerful lens to understand how patterns, logic, and structure shape the world around us' or '{target} is the topic' or '{target} is a very fundamental, very unique topic'.
     - Craft an original, vivid, and intellectually engaging opening line unique to {target}.
  2. STRICT NEGATIVE CONSTRAINT - NO DEFINITION DUMPS IN THIS TURN:
     DO NOT explain the formal textbook definition, mathematical mechanics, or what {target} assigns or calculates here (e.g. DO NOT say "In probability and statistics, a probability distribution assigns a probability to each outcome...").
     Keep all explanations, definitions, and operational mechanics strictly for the First Hint in the next turn!
  3. PRIOR KNOWLEDGE INQUIRY (SECOND PARAGRAPH):
     Ask cleanly and naturally without repeating phrases:
     "Before we dive in, I'd love to know: how familiar are you with **{target}**?"
  4. STRICT NEGATIVE CONSTRAINTS (CRITICAL):
     - NO warning badges, alert cards, or exclamation marks.
     - DO NOT output any parenthetical notes, unsolicited tips, warnings, formulas, or reminders (such as '(Note: ...)') in this turn.
     - DO NOT provide any hints in this turn (Hint 1, 2, or 3). Only provide the greeting hook, prior knowledge inquiry, and quick options so the user can type their answer.
  5. CONCLUDE WITH '### 🗺️ Quick Options' (Clickable Choices):
     - [I am completely new to this topic, guide me step-by-step from zero]
     - [I have a rough idea, test my understanding]
     - [Skip conversation and start explaining]"""
            )
        elif stage == "SIMPLIFIED_ANALOGY_BREAKDOWN":
            plan_blocks.append(
                f"""- MANDATORY PEDAGOGICAL DIRECTIVE (SIMPLIFIED 5-YEAR-OLD KID ANALOGY BREAKDOWN FOR {target}):
   1. EMPATHY & RESET:
      Acknowledge that the concept can feel tricky at first, apologize warmly for textbook jargon, and reset with a fresh, fun perspective.
   2. EXPLAIN LIKE TO A 5-YEAR-OLD KID (NO JARGON, NO DRY AXIOMS):
      - Use heading '### 🧸 Ultra-Simple Breakdown (The 5-Year-Old Picture): {target}'.
      - Explain using a vivid, everyday child-friendly physical analogy (e.g., candy jar with jellybeans, balancing a wooden ruler on pebbles, hiking trail crossing sea level, slicing pizza into french fries).
      - Strictly avoid dry axioms, integrals, or dense mathematical jargon. Keep it intuitive, visual, and tangible.
   3. RELATABLE MINIATURE PUZZLE:
      - Ask a simple, engaging intuitive question based on the analogy to ensure the student feels confident.
   4. CONCLUDE WITH '### 🗺️ Quick Options':
      - [I get it now! Show me a practical example]
      - [Explain with another simple analogy]
      - [Ready to solve a problem]"""
            )
        elif stage == "SOCRATIC_LAYER_2_HINT_1":
            plan_blocks.append(
                f"""- MANDATORY PEDAGOGICAL DIRECTIVE (SOCRATIC LAYER 2 - CONCEPT FOUNDATION & PRACTICE CHALLENGE FOR {target}):
  1. EVALUATE USER'S INITIAL ANSWER:
     Warmly analyze their response to the prior knowledge inquiry and acknowledge their starting intuition.
  2. DEEP GROUND-UP CONCEPTUAL EXPLANATION (MANDATORY):
     - STRICT PROHIBITION: DO NOT specify that it is a 'First Hint' or use the word 'hint' in the title or text! Use heading '### 🎯 Core Conceptual Foundation: {target}'.
     - DO NOT give a superficial 1-2 sentence definition and immediately jump to asking questions!
     - FIRST OF ALL: thoroughly explain {target} starting from the absolute basics to build genuine understanding for the student:
       * What is {target} fundamentally? What problem does it solve in real life / engineering / science?
       * How does it operate? Explain key terminology, constraints, and foundational mechanics clearly.
       * Provide an illustrative concrete scenario or example tailored specifically to {target}.
  3. INTERACTIVE PRACTICE CHALLENGE TO SOLVE:
     - After thoroughly explaining the concept and building understanding, present a concrete guided problem or thought challenge based on the explanation for the student to solve.
  4. CONCLUDE WITH '### 🗺️ Quick Options' (Clickable Choices, NO hint mentions):
     - [Let's solve this together step-by-step]
     - [I have an answer, let me explain]
     - [Show another practical example before solving]"""
            )
        elif stage == "SOCRATIC_LAYER_3_HINT_2":
            plan_blocks.append(
                f"""- MANDATORY PEDAGOGICAL DIRECTIVE (SOCRATIC LAYER 3 - OPERATIONAL MECHANICS & ALGORITHMIC EXECUTION FOR {target}):
  1. EVALUATE USER'S SOLUTION:
     Warmly analyze the user's answer to the previous practice challenge, validating their mathematical reasoning.
  2. DELIVER OPERATIONAL MECHANICS & FORMULAS (MANDATORY):
     - STRICT PROHIBITION: DO NOT specify that it is a 'Second Hint' or use the word 'hint'! Use heading '### ⚙️ Operational Mechanics & Algorithmic Methods: {target}'.
     - Thoroughly explain the governing equations, operational workflows, step-by-step algorithms, or parameters that drive {target}.
     - Break down why the formulas work mathematically.
  3. INTERACTIVE CALCULATION / APPLICATION CHALLENGE:
     - Present the next level guided calculation or scenario-based problem for the student to solve.
  4. CONCLUDE WITH '### 🗺️ Quick Options' (Clickable Choices, NO hint mentions):
     - [Let's solve this together step-by-step]
     - [Show the detailed formula breakdown]
     - [Proceed to synthesis & mastery]"""
            )
        elif stage == "SOCRATIC_LAYER_4_HINT_3":
            plan_blocks.append(
                f"""- MANDATORY PEDAGOGICAL DIRECTIVE (SOCRATIC LAYER 4 - ADVANCED SYNTHESIS & MASTERY CHALLENGE FOR {target}):
  1. EVALUATE USER's SOLUTION:
     Analyze the student's solution to the operational challenge, confirming precision.
  2. DELIVER ADVANCED SYNTHESIS & MASTERY (MANDATORY):
     - STRICT PROHIBITION: DO NOT specify that it is a 'Third Hint' or use the word 'hint'! Use heading '### 🚀 Advanced Synthesis & Master Challenge: {target}'.
     - Deliver a comprehensive synthesis comparing methods, examining convergence rates, error bounds, failure modes, or real-world trade-offs.
  3. FINAL MASTERY QUESTION:
     - Present an exam-level conceptual challenge or ask if they are ready to test their mastery with the adaptive practice quiz.
  4. CONCLUDE WITH '### 🗺️ Quick Options' (Clickable Choices, NO hint mentions):
     - [I'm ready for the adaptive practice quiz!]
     - [Proceed to the next curriculum topic]
     - [Review the operational formulas once more]"""
            )
        elif stage == "CURRICULUM_STEP_1_BASICS":
            plan_blocks.append(
                f"""- MANDATORY PEDAGOGICAL DIRECTIVE (CURRICULUM STEP 1 - MASTER GROUND-UP EXPLANATION FOR {target}):
  1. DIAGNOSED MASTERY SYNTHESIS:
     Synthesize the student's diagnosed knowledge depth across all 3 hints, acknowledge their level warmly, and confirm you are teaching from the ground up.
  2. MASTER GROUND-UP EXPLANATION (Human Teacher Style):
     Explain {target} starting from the very basics, definitions, what it means, why it exists, notation, and core principles.
  3. MULTIMODAL DELIVERY:
     - Structured Markdown comparison table
     - Intuitive Mermaid diagram / flowchart
     - Practical Python code snippet
     - Clean LaTeX formulas strictly with `$ ... $` and `$$\\n...\\n$$`
  4. CHECK UNDERSTANDING & BRIDGE TO NEXT TOPIC:
     Verify if the student understands these basics, and introduce the next basic topic in the curriculum progression, asking if they are ready to proceed.
  5. CONCLUDE WITH '### 🗺️ Quick Options':
     - [I understand! Move to the next topic]
     - [Show a quick visual or numerical example on the basics]
     - [I have a question about this topic]"""
            )
        elif stage == "CURRICULUM_STEP_2_OPERATIONS":
            plan_blocks.append(
                f"- PEDAGOGICAL DIRECTIVE (CURRICULUM STEP 2 - MECHANISMS & OPERATORS FOR {target}):\n"
                f"  1. Validate the student's grasp of the basics.\n"
                f"  2. Teach Level 2 (Finite Difference Operators & Table Construction):\n"
                f"     Explain the forward difference operator $\\Delta$, first differences $\\Delta y_0 = y_1 - y_0$, higher differences $\\Delta^2 y_0$, and how to build the difference table.\n"
                f"  3. Include a Markdown difference table, Mermaid flowchart, and Python snippet.\n"
                f"  4. Conclude by checking understanding and bridging to Level 3 (Formulas):\n"
                f"     Ask if they are ready for the interpolation formula.\n"
                f"  5. Quick Options:\n"
                f"     - [Ready! Move to Newton's Forward Interpolation Formula]\n"
                f"     - [Practice constructing a difference table together]"
            )
        elif stage == "CURRICULUM_STEP_3_FORMULAS":
            plan_blocks.append(
                f"- PEDAGOGICAL DIRECTIVE (CURRICULUM STEP 3 - FORMULAS & DEDUCTIONS FOR {target}):\n"
                f"  1. State Newton's Forward Difference Formula cleanly with LaTeX.\n"
                f"  2. Unpack the step parameter $p = \\frac{{x - x_0}}{{h}}$, factorials, and error considerations.\n"
                f"  3. Provide a formula summary table, diagram, and Python interpolation code snippet.\n"
                f"  4. Conclude by bridging to Level 4 (Advanced Numerical Worked Example & Applications):\n"
                f"     - [Solve a full numerical exam problem step-by-step]\n"
                f"     - [Explore Newton's Backward Formula & comparisons]"
            )
        elif stage == "CURRICULUM_STEP_4_ADVANCED":
            plan_blocks.append(
                f"- PEDAGOGICAL DIRECTIVE (CURRICULUM STEP 4 - ADVANCED WORKED EXAMPLES & PRACTICE FOR {target}):\n"
                f"  1. Walk through a complete numerical problem step-by-step with table construction and substitution.\n"
                f"  2. Sanity check the final result and highlight exam tips and common pitfalls.\n"
                f"  3. Conclude with options to practice additional problems or explore subsequent chapters."
            )
        elif stage == "DOCUMENT_OVERVIEW" or teaching_plan.get("is_document_summary"):
            plan_blocks.append(
                "- PEDAGOGICAL DIRECTIVE (DOCUMENT OVERVIEW):\n"
                "  1. Provide a comprehensive, inspiring big-picture overview of the uploaded chapter/topic.\n"
                "  2. Explain the central problem, why it matters, and the core mathematical framework.\n"
                "  3. Provide an organized breakdown of every key method/technique present in the context (core intuition, conditions, and formula).\n"
                "  4. Conclude with a helpful comparative summary table or decision matrix showing when to use each method.\n"
                "  5. Synthesize clearly for a student. Do not just dump raw calculations."
            )
        elif stage == "FOUNDATIONS_FIRST":
            plan_blocks.append(
                "- PEDAGOGICAL DIRECTIVE (FOUNDATIONS FIRST):\n"
                "  1. Focus strictly on building the foundational concept from the ground up: explain its meaning, intuition, arguments (x), entries (y), step size (h), and Interpolation vs Extrapolation.\n"
                "  2. DO NOT jump ahead to advanced formulas (Newton forward/backward), difference tables, or numerical problems in this first turn!\n"
                "  3. Provide a comparison table, an intuitive Mermaid diagram/flowchart, and a short Python code snippet.\n"
                "  4. Conclude with '### 🗺️ Next Learning Steps & Topic Options' listing 3-5 next topics formatted as `- [Topic]` for the student to choose."
            )
        elif stage == "DIFFERENCE_OPERATORS":
            plan_blocks.append(
                "- PEDAGOGICAL DIRECTIVE (FINITE DIFFERENCE OPERATORS):\n"
                "  1. Introduce the forward difference operator Δ, first differences Δy_0 = y_1 - y_0, and higher differences Δ^2 y_0.\n"
                "  2. Show how to construct and read a forward difference table.\n"
                "  3. Include a difference table, Mermaid flowchart, and Python snippet calculating differences.\n"
                "  4. Conclude with '### 🗺️ Next Learning Steps & Topic Options' listing next topics formatted as `- [Topic]`."
            )
        elif stage == "INTERPOLATION_FORMULA":
            plan_blocks.append(
                "- PEDAGOGICAL DIRECTIVE (INTERPOLATION FORMULA):\n"
                "  1. State Newton's Forward Difference Formula clearly using LaTeX.\n"
                "  2. Dissect each term and unpack the step parameter p = (x - x_0)/h.\n"
                "  3. Explain when and why to pick this formula (near the start of the table).\n"
                "  4. Include a summary table, diagram, and Python snippet.\n"
                "  5. Conclude with '### 🗺️ Next Learning Steps & Topic Options' formatted as `- [Topic]`."
            )
        elif stage == "SOLVE_PROBLEM":
            plan_blocks.append(
                "- PEDAGOGICAL DIRECTIVE (PROBLEM SOLVING):\n"
                "  1. State the given data, unknown variables, and the recommended approach.\n"
                "  2. Break down the solution step-by-step with clear arithmetic and reasoning.\n"
                "  3. Provide a sanity check on the calculated answer.\n"
                "  4. Conclude with '### 🗺️ Next Learning Steps & Topic Options' formatted as `- [Topic]`."
            )

        personalization = teaching_plan.get("personalization_directives", [])
        if personalization:
            plan_blocks.append("- LEARNER PERSONALIZATION DIRECTIVES:\n" + "\n".join(f"  * {p}" for p in personalization))

    plan_str = "\n".join(plan_blocks) + "\n\n" if plan_blocks else ""

    # 3. Format Multi-Turn Conversation History
    history_str = ""
    if conversation_history:
        recent_turns = []
        for msg in conversation_history[-6:]:
            role = "Student" if msg.get("sender") == "user" else "Tutor"
            text = msg.get("content", "").strip()
            if text:
                # Truncate very long previous tutor responses to keep prompt concise
                snippet = text if len(text) <= 400 else text[:400] + "..."
                recent_turns.append(f"{role}: {snippet}")
        if recent_turns:
            history_str = "RECENT CONVERSATION HISTORY (for context continuity):\n" + "\n".join(recent_turns) + "\n\n"

    user_prompt = f"""{plan_str}{history_str}COURSE MATERIAL CONTEXT (Your Verified Ground Truth):
{context_str}

STUDENT QUESTION:
{query}

PEDAGOGICAL TUTOR RESPONSE (Explain intuitively, unpack notation, guide step-by-step):"""

    return user_prompt

