import logging
import re
from typing import List, Dict, Any, Tuple
from app.rag.prompt_builder import SYSTEM_PROMPT, build_grounded_prompt
from app.rag.citation import extract_citations_from_chunks
from app.providers import llm_router

logger = logging.getLogger("study_companion.rag.generator")

def format_sectional_citations(text: str) -> str:
    """
    Normalizes inline and sectional source citations (e.g. '[Source: Page 21]', 'Source: Page 21', 'Page 21')
    so they render as interactive markdown links [Page X](#page-X) rather than being stripped out.
    """
    if not text:
        return ""

    def repl_bracket(m):
        full = m.group(1).strip()
        num_m = re.search(r'\d+', full)
        target = f"#page-{num_m.group(0)}" if num_m else "#"
        return f"> 📖 **Source: [{full}]({target})**"

    formatted = re.sub(r'\[Source:\s*([^\]]+)\]', repl_bracket, text, flags=re.I)

    def repl_paren(m):
        full = m.group(1).strip()
        num_m = re.search(r'\d+', full)
        target = f"#page-{num_m.group(0)}" if num_m else "#"
        return f"> 📖 **Source: [Page {num_m.group(0)}]({target})**"

    formatted = re.sub(r'\((?:Source:\s*)?Page\s*(\d+(?:[–\-]\d+)?)\)', repl_paren, formatted, flags=re.I)

    def repl_bare_line(m):
        p_num = m.group(2)
        note = m.group(3) or ""
        note_clean = note.strip(' •*-')
        note_str = f" • *{note_clean}*" if note_clean else ""
        return f"> 📖 **Source: [Page {p_num}](#page-{p_num})**{note_str}"

    formatted = re.sub(
        r'(?m)^(\s*>*\s*📖?\s*(?:\*\*)?Source:\s*(?:\*\*)?)\s*(?:Page|p\.)?\s*(\d+)(.*)$',
        repl_bare_line,
        formatted,
        flags=re.I
    )

    formatted = re.sub(r'\[\s*\[([^\]]+)\]\((#[^\)]+)\)\s*\]', r'[\1](\2)', formatted)
    
    # Clean up broken LaTeX formulas (e.g. `\$h = x_{i+1} - x_i\` or `\$\Delta y_i = y_{i+1} - y_i\`)
    # 1. Whole-line escaped math: `\$... \` or `\$...` -> `$$\n...\n$$`
    formatted = re.sub(r'(?m)^[ \t]*\\+\$([^\n]+?)(?:\\+\$|\\+)?\s*$', r'\n\n$$\n\1\n$$\n\n', formatted)
    # 2. Display blocks with escaped dollars: `$$\$...\$$` -> `$$\n...\n$$`
    formatted = re.sub(r'\$\$\s*\\+\$?([\s\S]*?)\\+\$?\s*\$\$', r'$$\n\1\n$$', formatted)
    # 3. Trailing backslashes right before closing $$
    formatted = re.sub(r'(?m)\\+\s*\$\$$', '$$', formatted)
    # 4. Inline escaped math: `\$...\$` or `\$...\ ` -> `$ ... $`
    formatted = re.sub(r'(?:^|[ \t])\\+\$([^\$\n]+?)\\+(?:\$|[ \t]|$)', r' $\1$ ', formatted)
    # 5. Any remaining `\$` delimiter
    formatted = re.sub(r'\\+\$', '$', formatted)
    # 6. Normalize display math blocks
    formatted = re.sub(r'\$\$([\s\S]*?)\$\$', lambda m: f"\n\n$$\n{m.group(1).strip().rstrip(chr(92)).strip()}\n$$\n\n", formatted)
    return formatted.strip()


def generate_grounded_answer(
    query: str,
    chunks: List[Dict[str, Any]],
    teaching_plan: Dict[str, Any] = None,
    image_paths: List[str] = None,
    conversation_history: List[Dict[str, Any]] = None
) -> Tuple[str, List[Dict[str, Any]], bool]:
    """
    Multimodal Document-Grounded Answer Generator.
    Routes prompt and retrieved document context through Provider-Agnostic LLM Router.
    Enforces automatic priority failover (OpenAI -> Gemini -> OpenRouter -> Ollama).
    Guarantees ZERO raw PDF chunk text copying fallback.
    Enforces 100% canonical citation object consistency.
    """
    target_name = teaching_plan.get("target_name") if teaching_plan else query
    coverage_state = teaching_plan.get("coverage_state", "STATE_C_SUFFICIENT_INFO") if teaching_plan else "STATE_C_SUFFICIENT_INFO"

    teaching_stage = teaching_plan.get("teaching_stage", "DIRECT_EXPLANATION") if teaching_plan else "DIRECT_EXPLANATION"
    is_intro_probe = teaching_stage in {"SOCRATIC_LAYER_1_PROBE", "SOCRATIC_LAYER_2_HINT_1", "SOCRATIC_LAYER_3_HINT_2", "SOCRATIC_LAYER_4_HINT_3"}
    is_pedagogical_track = teaching_stage.startswith("CURRICULUM_STEP") or teaching_stage in {"FOUNDATIONS_FIRST", "DIFFERENCE_OPERATORS", "INTERPOLATION_FORMULA"}

    # 1. Post-Retrieval Evidence Assessment
    if not chunks and not is_intro_probe and not is_pedagogical_track:
        return (
            f"This topic '**{target_name}**' is not covered in your uploaded course material. I couldn't find enough information in the provided documents.",
            [],
            False
        )

    # Check if target truly lacks evidence across retrieved chunks
    if coverage_state == "STATE_A_NOT_FOUND" and not is_intro_probe and not is_pedagogical_track:
        query_terms = [
            w for w in re.sub(r'[^a-zA-Z0-9]+', ' ', query.lower()).split()
            if len(w) > 3 and w not in ["what", "explain", "about", "tell", "teach", "give", "show", "formula", "method"]
        ]
        has_strong_chunk = any(
            c.get("page_type") != "COVER_METADATA" and
            len(c.get("content", "").split()) > 15 and
            (any(t in c.get("content", "").lower() for t in query_terms) if query_terms else True)
            for c in chunks
        )
        if not has_strong_chunk and not is_intro_probe:
            return (
                f"This topic '**{target_name}**' is not covered in your uploaded course material. I couldn't find enough information in the provided documents.",
                [],
                False
            )
        else:
            coverage_state = "STATE_C_SUFFICIENT_INFO"


    # Filter out cover metadata chunks if substantive content chunks exist
    substantive_chunks = [c for c in chunks if c.get("page_type") != "COVER_METADATA" and len(c.get("content", "").split()) > 10]
    effective_chunks = substantive_chunks if substantive_chunks else chunks

    top_chunk = effective_chunks[0] if effective_chunks else {}
    top_text = top_chunk.get("content", "").strip()

    # Check if top chunk is cover metadata with zero body explanation
    if top_chunk and (top_chunk.get("page_type") == "COVER_METADATA" or (top_chunk.get("page_number") == 1 and len(top_text.split()) < 20 and not substantive_chunks)):
        return (
            f"This topic '**{target_name}**' is not covered in your uploaded course material. The document header on Page 1 mentions this topic, but no substantive body content or definitions were found.",
            [],
            False
        )

    # Canonical evidence citation extraction from effective chunks used
    teaching_stage = teaching_plan.get("teaching_stage", "DIRECT_EXPLANATION") if teaching_plan else "DIRECT_EXPLANATION"
    is_intro_probe = teaching_stage in {"SOCRATIC_LAYER_1_PROBE", "SOCRATIC_LAYER_2_HINT_1", "SOCRATIC_LAYER_3_HINT_2", "SOCRATIC_LAYER_4_HINT_3"}
    citations = [] if is_intro_probe else extract_citations_from_chunks(effective_chunks)

    # 2. STATE B: PARTIAL INFO (Subtopics available, but no standalone definition)
    # Even in partial info, synthesize with tutor warmth and pedagogical scaffolding:
    if coverage_state == "STATE_B_PARTIAL_INFO":
        page_num = top_chunk.get("page_number") or 1
        page_end = top_chunk.get("page_end") or page_num
        page_label = f"pp. {page_num}–{page_end}" if page_end > page_num else f"Page {page_num}"
        doc_title = top_chunk.get("document_title", "Course Document")
        
        # Build prompt to synthesize subtopic material pedagogically
        grounded_prompt = build_grounded_prompt(
            query, effective_chunks, teaching_plan, conversation_history=conversation_history
        )
    else:
        # 3. Build grounded prompt with document evidence and pedagogical directives
        grounded_prompt = build_grounded_prompt(
            query, effective_chunks, teaching_plan, conversation_history=conversation_history
        )

    # 3. Route to Multi-Provider LLM Architecture with Automatic Priority Failover
    logger.info(f"Generating answer via LLM Provider Router for query: '{query[:50]}...'")
    if image_paths is None:
        import os
        extracted_images = []
        for c in effective_chunks:
            p = c.get("visual_image_path")
            if p and os.path.exists(p) and p not in extracted_images:
                extracted_images.append(p)
        if extracted_images:
            image_paths = extracted_images[:2]

    provider_response = llm_router.generate(
        prompt=grounded_prompt,
        system_prompt=SYSTEM_PROMPT,
        image_paths=image_paths
    )

    if provider_response.is_success:
        clean_content = format_sectional_citations(provider_response.content)
        if teaching_stage == "SOCRATIC_LAYER_1_PROBE":
            # Strip unwanted parenthetical notes, unsolicited formulas, or tips like (Note: ...)
            clean_content = re.sub(r'\(Note:[\s\S]*?\)', '', clean_content, flags=re.I)
            clean_content = re.sub(r'(?m)^[ \t]*>\s*\(?Note:.*$', '', clean_content, flags=re.I)
            clean_content = re.sub(r'(?m)^[ \t]*Note:.*$', '', clean_content, flags=re.I)
            # Remove any ungrammatical robotic formula if produced by model
            clean_content = re.sub(r'[A-Za-z0-9\s]+ is the topic\.\s*[A-Za-z0-9\s]+ is a very fundamental[^\.\n]+\.', '', clean_content, flags=re.I)
            # Clean redundant repetition if present
            clean_content = clean_content.replace(
                "Before we start the topic let me know how much you know about this topic: How much do you know about",
                "Before we dive in, I'd love to know: how familiar are you with"
            )
            clean_content = re.sub(r'\n{3,}', '\n\n', clean_content).strip()
        if coverage_state == "STATE_B_PARTIAL_INFO" and f"covers specific subtopics for **{target_name}**" not in clean_content:
            doc_title = top_chunk.get("document_title", "Course Document")
            prefix = f"> ℹ️ *Note: The uploaded material covers specific subtopics for **{target_name}** in {doc_title}, but lacks a standalone introductory definition. Here is an intuitive synthesis based on the available material:*\n\n"
            clean_content = prefix + clean_content
        logger.info(f"Answer generation successful via provider '{provider_response.provider_name}'")
        return clean_content, citations, True

    # 4. Pedagogical Socratic Offline Fallback (Guaranteed 100% Uptime for Learning Sessions)
    if is_intro_probe:
        from app.tutor.teaching_planner import get_topic_opening_hook
        raw_student_name = teaching_plan.get("student_name") if teaching_plan else None
        student_name = raw_student_name if (raw_student_name and raw_student_name.strip().lower() not in ["demo_student", "guest", "student", "jishnu", "default", "none"]) else None
        greeting_line = f"Hello {student_name}!" if student_name else "Hello!"
        hook = get_topic_opening_hook(target_name)

        if teaching_stage == "SOCRATIC_LAYER_1_PROBE":
            fallback_intro = (
                f"{greeting_line} {hook}\n\n"
                f"Before we dive in, I'd love to know: how familiar are you with **{target_name}**?\n\n"
                f"### 🗺️ Quick Options\n"
                f"- [I am completely new to this topic, guide me step-by-step from zero]\n"
                f"- [I have a rough idea, test my understanding]\n"
                f"- [Skip hints & explain directly from basics to advanced]"
            )
            logger.info("Delivering offline pedagogical intro probe (Layer 1)")
            return fallback_intro, [], True

        elif teaching_stage == "SOCRATIC_LAYER_2_HINT_1":
            from app.tutor.teaching_planner import get_topic_groundup_explanation
            groundup_data = get_topic_groundup_explanation(target_name)

            options_text = "\n".join([f"- [{opt}]" for opt in groundup_data["options"]])
            fallback_explanation = (
                f"That is a great starting perspective!\n\n"
                f"{groundup_data['heading']}\n\n"
                f"{groundup_data['explanation']}\n\n"
                f"{groundup_data['challenge']}\n\n"
                f"### 🗺️ Quick Options\n"
                f"{options_text}"
            )
            logger.info(f"Delivering ground-up foundational explanation and practice challenge for '{target_name}'")
            return fallback_explanation, [], True

        elif teaching_stage == "SOCRATIC_LAYER_3_HINT_2":
            from app.tutor.teaching_planner import get_topic_operational_mechanics
            mechanics_data = get_topic_operational_mechanics(target_name)

            options_text = "\n".join([f"- [{opt}]" for opt in mechanics_data["options"]])
            fallback_mechanics = (
                f"{mechanics_data['heading']}\n\n"
                f"{mechanics_data['explanation']}\n\n"
                f"{mechanics_data['challenge']}\n\n"
                f"### 🗺️ Quick Options\n"
                f"{options_text}"
            )
            logger.info(f"Delivering operational mechanics and algorithmic execution for '{target_name}' (Turn 2)")
            return fallback_mechanics, [], True

        elif teaching_stage == "SOCRATIC_LAYER_4_HINT_3":
            from app.tutor.teaching_planner import get_topic_synthesis_mastery
            synthesis_data = get_topic_synthesis_mastery(target_name)

            options_text = "\n".join([f"- [{opt}]" for opt in synthesis_data["options"]])
            fallback_synthesis = (
                f"{synthesis_data['heading']}\n\n"
                f"{synthesis_data['explanation']}\n\n"
                f"{synthesis_data['challenge']}\n\n"
                f"### 🗺️ Quick Options\n"
                f"{options_text}"
            )
            logger.info(f"Delivering advanced synthesis and mastery verification for '{target_name}' (Turn 3)")
            return fallback_synthesis, [], True

    # 5. Zero Copy-Paste Fallback: If ALL LLM providers fail or are exhausted on non-socratic turns, return transparent service notification
    logger.error(f"All LLM Providers failed. Error: {provider_response.error_message}")
    fail_message = (
        f"⚠️ **Service Unavailable**: All configured AI LLM providers (OpenAI, Gemini, OpenRouter, Ollama) "
        f"are currently experiencing quota limits, rate limits, or connectivity issues.\n\n"
        "Please try again shortly. The server logs contain the provider-level "
        "diagnostic needed to distinguish quota, model-access, and network errors."
    )
    return fail_message, citations, False
