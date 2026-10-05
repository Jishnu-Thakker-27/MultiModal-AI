import logging
import re
from typing import List, Dict, Any, Tuple
from app.rag.prompt_builder import SYSTEM_PROMPT, build_grounded_prompt
from app.rag.citation import extract_citations_from_chunks
from app.providers import llm_router

logger = logging.getLogger("study_companion.rag.generator")

def strip_inline_textual_citations(text: str) -> str:
    """
    Strips LLM-invented inline textual page strings like '[Source: Page 21]' or '(Page 14)'
    to enforce canonical backend evidence object citation rendering.
    """
    text_clean = re.sub(r'\[Source:\s*[^\]]+\]', '', text, flags=re.I)
    text_clean = re.sub(r'\(Page\s*\d+(?:–\d+)?\)', '', text_clean, flags=re.I)
    return text_clean.strip()

def generate_grounded_answer(
    query: str,
    chunks: List[Dict[str, Any]],
    teaching_plan: Dict[str, Any] = None,
    image_paths: List[str] = None
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

    # Assess max final score of retrieved chunks
    max_score = max([c.get("final_score", 0.0) for c in chunks]) if chunks else 0.0
    # A missing target must never be sent to an LLM just because generic words
    # inflated a retriever score.  Document summaries use STATE_C explicitly.
    if coverage_state == "STATE_A_NOT_FOUND":
        return (
            f"This topic '**{target_name}**' is not covered in your uploaded course material. I couldn't find enough information in the provided documents.",
            [],
            False
        )


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
    if coverage_state == "STATE_B_PARTIAL_INFO":
        page_num = top_chunk.get("page_number") or 1
        page_end = top_chunk.get("page_end") or page_num
        page_label = f"pp. {page_num}–{page_end}" if page_end > page_num else f"Page {page_num}"
        doc_title = top_chunk.get("document_title", "Course Document")
        synthesized_answer = (
            f"## {target_name}\n\n"
            f"The uploaded course document **{doc_title}** ({page_label}) covers specific subtopics for **{target_name}**, "
            f"but does not contain a standalone introductory definition.\n\n"
            f"### Available Subtopic Material ({doc_title} · {page_label})\n\n"
            f"{top_text}\n"
        )
        return strip_inline_textual_citations(synthesized_answer), citations, True

    # 3. Build grounded prompt with document evidence and pedagogical directives
    grounded_prompt = build_grounded_prompt(query, effective_chunks, teaching_plan)

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
        clean_content = strip_inline_textual_citations(provider_response.content)
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
