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
        retrieved_chunks: List[Dict[str, Any]],
        tone: str = "Intuitive Analogy"
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
                f"2. Intuitive synthesis of available subtopic content from course material"
            ]
        elif intent in ["OVERVIEW", "SUMMARY"]:
            teaching_stage = "DOCUMENT_OVERVIEW"
            concepts_to_cover = [
                f"1. Big-Picture Framing: Core motivation, purpose, and central problem of {target_name}",
                f"2. Core Topics & Key Methods: Systematic breakdown of every major method, concept, and technique with formulas",
                f"3. Comparative Decision Matrix: When and why to choose each method over others"
            ]
        elif intent in ["SOLVE_PROBLEM", "EXAMPLE"]:
            teaching_stage = "SOLVE_PROBLEM"
            concepts_to_cover = [
                f"1. Problem Setup & Strategic Intuition for {target_name}",
                f"2. Chronological Step-by-Step Calculation with Explanations",
                f"3. Verification, Sanity Check, and Practical Takeaways"
            ]
        elif is_intro or intent in ["LEARN_CONCEPT", "DEFINITION"]:
            teaching_stage = "FOUNDATIONS_FIRST"
            c_type = target_node.concept_type if target_node else "concept"

            if c_type in ["algorithm", "procedure"]:
                concepts_to_cover = [
                    f"1. Intuitive Hook & The Problem {target_name} Solves",
                    f"2. Step-by-Step Mechanism with Notation Breakdown",
                    f"3. Annotated Worked Example & Practical Complexity"
                ]
            elif c_type in ["formula", "theorem", "principle"]:
                concepts_to_cover = [
                    f"1. Intuitive Mental Model: Why does {target_name} exist?",
                    f"2. Formal Equation & Dissecting Each Symbol in Notation",
                    f"3. Step-by-Step Application with Pro-Tips and Pitfalls"
                ]
            else:
                concepts_to_cover = [
                    f"1. Intuitive Mental Model & Real-World Analogy for {target_name}",
                    f"2. Formal Definition, Mathematical Mechanism & Notation",
                    f"3. Practical Worked Example & Socratic Check-in"
                ]
        elif needs_bridge and missing_prereqs:
            teaching_stage = "PREREQUISITE_BRIDGE"
            p_names = ", ".join([p.name for p in missing_prereqs[:2]])
            concepts_to_cover = [
                f"1. Brief Prerequisite Bridge ({p_names})",
                f"2. Main Topic: {target_name}"
            ]
        else:
            teaching_stage = "FOUNDATIONS_FIRST"
            concepts_to_cover = [
                f"1. Intuitive Core Concept for {target_name}",
                f"2. In-Depth Explanation with Notation Unpacked",
                f"3. Concrete Application & Next Steps"
            ]

        # Tone-specific pedagogical instructions
        tone_map = {
            "Intuitive Analogy": (
                "Lead with an intuitive, memorable real-world analogy before presenting any formula. "
                "Demystify abstract math symbols by connecting them to tangible everyday physical processes."
            ),
            "Socratic First Principles": (
                "Deconstruct the concept down to fundamental axioms. Ask guiding questions that lead the "
                "student to deduce the conclusion themselves, emphasizing why each step is logically necessary."
            ),
            "Mathematical Formalism": (
                "Deliver rigorous mathematical precision: clearly state theorem conditions, assumptions, "
                "domain/boundary constraints, and step-by-step analytical derivations."
            ),
            "Exam Prep": (
                "Focus on high-yield exam takeaways: provide quick checklists, common exam traps, "
                "memorization tricks, and efficient step-by-step problem-solving templates."
            ),
        }
        tone_directive = tone_map.get(tone, tone_map["Intuitive Analogy"])

        # Learner Memory Scaffolding (Weak Topic Support & Misconception Remediation)
        learner_profile = pedagogical_context.get("learner_profile") or {}
        weak_topics = [wt.get("topic_name") if isinstance(wt, dict) else wt for wt in learner_profile.get("weak_topics", [])]
        active_misconceptions = [m.get("text") if isinstance(m, dict) else m for m in learner_profile.get("active_misconceptions", [])]
        is_target_weak = any(target_name.lower() in wt.lower() or wt.lower() in target_name.lower() for wt in weak_topics)

        personalization_directives = []
        if is_target_weak:
            personalization_directives.append(
                f"- LEARNER SCAFFOLDING NOTE: The student has shown lower historical mastery in '{target_name}'. "
                "Explain foundational prerequisites gently, use a tangible sensory or visual analogy, and unpack basic arithmetic steps without rushing."
            )
        if active_misconceptions:
            misc_summary = "; ".join(active_misconceptions[:2])
            personalization_directives.append(
                f"- MISCONCEPTION REMEDIATION: The student previously struggled with: [{misc_summary}]. "
                "Explicitly point out the correct conceptual intuition and address this common pitfall without being condescending."
            )

        check_question = f"Would you like to solve a practice problem on {target_name} together, or examine a specific calculation step?"

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
            "active_misconceptions": active_misconceptions,
            "tone": tone,
            "tone_directive": tone_directive
        }
