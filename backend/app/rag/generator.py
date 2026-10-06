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

    # 1. Post-Retrieval Evidence Assessment
    if not chunks:
        return (
            f"This topic '**{target_name}**' is not covered in your uploaded course material. I couldn't find enough information in the provided documents.",
            [],
            False
        )

    # Check if target truly lacks evidence across retrieved chunks
    if coverage_state == "STATE_A_NOT_FOUND":
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
        if not has_strong_chunk:
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

    top_chunk = effective_chunks[0]
    top_text = top_chunk.get("content", "").strip()

    # Check if top chunk is cover metadata with zero body explanation
    if top_chunk.get("page_type") == "COVER_METADATA" or (top_chunk.get("page_number") == 1 and len(top_text.split()) < 20 and not substantive_chunks):
        return (
            f"This topic '**{target_name}**' is not covered in your uploaded course material. The document header on Page 1 mentions this topic, but no substantive body content or definitions were found.",
            [],
            False
        )

    # Canonical evidence citation extraction from effective chunks used
    citations = extract_citations_from_chunks(effective_chunks)

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
        logger.info(f"Answer generation successful via provider '{provider_response.provider_name}'")
        return clean_content, citations, True

    # 4. Zero Copy-Paste Fallback: If ALL LLM providers fail or are exhausted, return transparent service notification
    logger.error(f"All LLM Providers failed. Error: {provider_response.error_message}")
    fail_message = (
        f"⚠️ **Service Unavailable**: All configured AI LLM providers (OpenAI, Gemini, OpenRouter, Ollama) "
        f"are currently experiencing quota limits, rate limits, or connectivity issues.\n\n"
        "Please try again shortly. The server logs contain the provider-level "
        "diagnostic needed to distinguish quota, model-access, and network errors."
    )
    return fail_message, citations, False
