import logging
from typing import List, Dict, Any

logger = logging.getLogger("study_companion.tutor.teaching_planner")

class TeachingPlanner:
    """
    Generalized Topic-Agnostic Teaching Planner.
    Constructs an explicit pedagogical plan based on the 3-state target coverage model:
    - STATE_A_NOT_FOUND: Topic not in course material.
    - STATE_B_PARTIAL_INFO: Subtopics/operations exist, but no standalone definition.
    - STATE_C_SUFFICIENT_INFO: Complete source coverage available.
    """
    def create_plan(
        self,
        query: str,
        intent_info: Dict[str, Any],
        pedagogical_context: Dict[str, Any],
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        intent = intent_info.get("intent", "EXPLAIN_CONCEPT")
        target_name = pedagogical_context.get("target_name") or "the requested concept"
        target_node = pedagogical_context.get("target_concept")
        coverage_state = pedagogical_context.get("target_coverage_state", "STATE_C_SUFFICIENT_INFO")
        missing_prereqs = pedagogical_context.get("missing_prerequisites", [])
        needs_bridge = pedagogical_context.get("needs_prereq_bridge", False)
        is_intro = pedagogical_context.get("is_introductory_request", False)
        target_found = pedagogical_context.get("target_found", True)

        teaching_stage = "DIRECT_EXPLANATION"
        concepts_to_cover = []

        if coverage_state == "STATE_A_NOT_FOUND" or not target_found:
            teaching_stage = "NOT_FOUND"
            concepts_to_cover = [f"Notification: '{target_name}' is not in course material"]

        elif coverage_state == "STATE_B_PARTIAL_INFO":
            teaching_stage = "PARTIAL_INFO"
            concepts_to_cover = [
                f"1. Context Notice: Uploaded material covers specific subtopics/operations for {target_name}, but lacks a full introductory definition.",
                f"2. Explanation of available subtopic content from course material"
            ]
        elif intent in ["OVERVIEW", "SUMMARY"]:
            teaching_stage = "DOCUMENT_OVERVIEW"
            concepts_to_cover = [
                f"1. Executive Summary: Core focus and purpose of {target_name}",
                f"2. Core Topics & Key Methods: Systematic breakdown of every major method, concept, and technique in the document",
                f"3. Practical Applications & Working Conditions"
            ]
        elif is_intro or intent in ["LEARN_CONCEPT", "DEFINITION"]:
            teaching_stage = "FOUNDATIONS_FIRST"
            c_type = target_node.concept_type if target_node else "concept"

            if c_type in ["algorithm", "procedure"]:
                concepts_to_cover = [
                    f"1. Problem & Core Idea of {target_name}",
                    f"2. Step-by-Step Procedure for {target_name}",
                    f"3. Example & Complexity"
                ]
            elif c_type in ["formula", "theorem", "principle"]:
                concepts_to_cover = [
                    f"1. Definition & Intuition of {target_name}",
                    f"2. Conditions & Formula/Theorem",
                    f"3. Practical Application"
                ]
            else:
                concepts_to_cover = [
                    f"1. Core Definition & Purpose of {target_name}",
                    f"2. Key Components & How {target_name} Works",
                    f"3. Practical Example & Applications"
                ]
        elif needs_bridge and missing_prereqs:
            teaching_stage = "PREREQUISITE_BRIDGE"
            p_names = ", ".join([p.name for p in missing_prereqs[:2]])
            concepts_to_cover = [
                f"1. Brief Prerequisite Context ({p_names})",
                f"2. Main Topic: {target_name}"
            ]
        else:
            teaching_stage = "DIRECT_EXPLANATION"
            concepts_to_cover = [f"Direct Explanation of {target_name}"]

        # Learner Memory Scaffolding (Weak Topic Support & Misconception Remediation)
        learner_profile = pedagogical_context.get("learner_profile") or {}
        weak_topics = [wt.get("topic_name") if isinstance(wt, dict) else wt for wt in learner_profile.get("weak_topics", [])]
        active_misconceptions = [m.get("text") if isinstance(m, dict) else m for m in learner_profile.get("active_misconceptions", [])]
        is_target_weak = any(target_name.lower() in wt.lower() or wt.lower() in target_name.lower() for wt in weak_topics)

        personalization_directives = []
        if is_target_weak:
            personalization_directives.append(
                f"- LEARNER SCAFFOLDING NOTE: The student has shown lower historical mastery (<50%) in '{target_name}'. "
                "Explain foundational prerequisites gently, use an intuitive sensory or structural analogy, and avoid assuming prior mastery."
            )
        if active_misconceptions:
            misc_summary = "; ".join(active_misconceptions[:2])
            personalization_directives.append(
                f"- MISCONCEPTION REMEDIATION: The student previously struggled with: [{misc_summary}]. "
                "Explicitly point out the correct conceptual intuition and address this common pitfall without being condescending."
            )

        check_question = f"Would you like to solve a practice question on {target_name} or explore an example?"

        return {
            "query": query,
            "intent": intent,
            "target_name": target_name,
            "target_found": target_found,
            "coverage_state": coverage_state,
            "teaching_stage": teaching_stage,
            "concepts_to_cover": concepts_to_cover,
            "retrieved_chunks": retrieved_chunks,
            "needs_bridge": needs_bridge,
            "check_question": check_question,
            "personalization_directives": personalization_directives,
            "is_target_weak": is_target_weak,
            "active_misconceptions": active_misconceptions
        }
