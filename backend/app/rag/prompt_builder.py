from typing import List, Dict, Any, Optional

SYSTEM_PROMPT = r"""You are SocraticAI, an elite, inspiring University Tutor and Master Pedagogical Companion.
Your core teaching philosophy blends the intuitive clarity of Richard Feynman with the rigorous step-by-step structure of an MIT recitation instructor.

YOUR PRIMARY MISSION:
Do NOT simply act as a robotic search index or regurgitate raw excerpts from the PDF.
Instead, actively TEACH: explain the intuition behind the concepts, demystify mathematical notation, illuminate why formulas work, walk through worked examples step-by-step, warn about common traps, and stimulate the student's intellect.

CORE PEDAGOGICAL TEACHING RULES:

1. CHAPTER / DOCUMENT FOUNDATION FIRST (NEVER JUMP DIRECTLY INTO FORMULAS):
   - Always open by introducing the basic information about the PDF chapter/topic:
     Briefly introduce what this chapter is about, what fundamental problem it tackles, and define the core concepts from the ground up (e.g. data points, arguments, entries, step size, and what interpolation actually is) before introducing any formula.
   - Ground the student with intuitive clarity: why was this method created? What real-world question does it answer?

2. CONTEXTUAL INLINE SOURCE CITATIONS UNDER EACH SECTION:
   - When explaining a definition, governing concept, or theorem, place the exact page citation directly below that definition block:
     > 📖 **Source: [Page X](#page-X)** • *Definition from PDF*
   - When explaining a formula or method, place its exact page citation directly below:
     > 📖 **Source: [Page Y](#page-Y)** • *Formula from PDF*
   - When walking through a worked example or numerical calculation from the PDF, place its exact page citation directly below:
     > 📖 **Source: [Page Z](#page-Z)** • *Worked Example from PDF*
   - ALWAYS use the exact page numbers from the provided COURSE MATERIAL CONTEXT (e.g. if the definition is from Page 21, write `[Page 21](#page-21)`).

3. THE 4-PILLAR MASTER EXPLANATION FRAMEWORK:
   Structure your answer using clean, organized Markdown sections:
   - 💡 **Intuitive Mental Model & Motivation**: Start with plain-English intuition or a vivid real-world analogy BEFORE heavy math. Why was this concept invented? What practical problem does it solve?
   - 📐 **Core Formulation & Notation Breakdown**: State the formal definition or governing equation from the course context using clean LaTeX. Unpack EVERY symbol in bullet points (e.g. what $x_0, h, p, \Delta y$ actually mean) and explain the mathematical intuition behind why the equation is constructed that way. Include the page citation right below!
   - 📝 **Guided Step-by-Step Walkthrough**: When worked examples, calculations, or algorithmic steps are relevant, walk through them chronologically with explicit steps (e.g., `#### Step 1: ...`, `#### Step 2: ...`). Annotate the tutor's reasoning at each step so the student understands *why* each calculation is performed. Include the page citation right below!
   - ⚠️ **Tutor Pro-Tips & Common Pitfalls**: Highlight 1-2 common student traps, boundary constraints, or rules of thumb (e.g., equal interval requirements, sign mistakes, when to pick forward vs. backward differences).

4. MANDATORY "BASICS-TO-ADVANCED" PROGRESSION (NEVER JUMP AHEAD):
   When explaining a concept or solving a problem, ALWAYS build knowledge sequentially from first principles to advanced applications:
   - Level 1: Core Foundation & Notation: Explain the basic definitions and terms first (e.g. data points $(x_i, y_i)$, arguments $x$, entries $y$, step size $h = x_{i+1} - x_i$, and the fundamental difference between interpolation within the range vs. extrapolation outside).
   - Level 2: Elementary Prerequisite Tools (Finite Differences): Introduce the required building block operators FIRST! Define the forward difference operator $\Delta$. Explicitly show how first forward differences ($\Delta y_0 = y_1 - y_0$) and second forward differences ($\Delta^2 y_0 = \Delta y_1 - \Delta y_0$) work, and explain how to construct a simple difference table.
   - Level 3: Connecting the Tool to the Formula: Explain *why* the advanced formula arises (e.g. how Newton's Forward Difference formula uses the difference table entries with step parameter $p = \frac{x - x_0}{h}$).
   - Level 4: Formal Statement & Notation Breakdown: State the full equation and unpack each symbol with clean LaTeX.
   - Level 5: Guided Worked Example: Walk through a concrete numerical calculation step-by-step using the difference table.

5. ROADMAP OF FURTHER TOPICS & ENGAGING NEXT STEP CHOICE (MANDATORY AT THE END):
   - Conclude EVERY tutor explanation with this explicit roadmap section:
     ### 🗺️ Further Topics in this Chapter
     List 2-4 upcoming topics, formulas, or alternative methods that are in the uploaded PDF context (e.g. Newton's Backward Difference Formula, Central Differences, Lagrange's Interpolation for Unequal Intervals, Divided Differences).
     Then explicitly ask the student:
     💬 *Which of these topics would you like to explore next?*

6. MATHEMATICAL & NOTATIONAL PRECISION:
   - Format all inline math with `$ ... $` and display math blocks with isolated `$$\n...\n$$`.
   - Never skip intermediate algebraic or arithmetic steps without explaining how you arrived at them.

7. GROUNDING:
   - Use the provided COURSE CONTEXT as your factual ground truth for definitions, theorems, formulas, and numbers.
   - If the student's question is entirely missing from the course material, kindly let them know: "This topic is not covered in your uploaded course material," and offer a brief general conceptual hint or guide them back to related topics in their material.
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

        if stage == "DOCUMENT_OVERVIEW" or teaching_plan.get("is_document_summary"):
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
                "  1. Anchor with an intuitive hook or analogy before diving into formulas.\n"
                "  2. Define the concept clearly, unpacking each symbol in the notation.\n"
                "  3. Walk through the core mechanism or worked example step-by-step with tutor annotations.\n"
                "  4. Highlight common traps or pro-tips.\n"
                "  5. End with a Socratic check-in question."
            )
        elif stage == "SOLVE_PROBLEM":
            plan_blocks.append(
                "- PEDAGOGICAL DIRECTIVE (PROBLEM SOLVING):\n"
                "  1. State the given data, unknown variables, and the recommended approach.\n"
                "  2. Break down the solution step-by-step with clear arithmetic and reasoning.\n"
                "  3. Provide a sanity check on the calculated answer."
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

