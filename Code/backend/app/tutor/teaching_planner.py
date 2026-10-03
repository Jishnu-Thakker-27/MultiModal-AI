import logging
from typing import List, Dict, Any

logger = logging.getLogger("study_companion.tutor.teaching_planner")

class TeachingPlanner:
    """
    Generalized Topic-Agnostic Teaching Planner.
    Constructs an explicit pedagogical plan centered around the user's explicit TARGET CONCEPT.
    Ensures target concept remains dominant throughout the lesson.
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
        missing_prereqs = pedagogical_context.get("missing_prerequisites", [])
        needs_bridge = pedagogical_context.get("needs_prereq_bridge", False)
        is_intro = pedagogical_context.get("is_introductory_request", False)
        target_found = pedagogical_context.get("target_found", True)

        teaching_stage = "DIRECT_EXPLANATION"
        concepts_to_cover = []

        if not target_found:
            teaching_stage = "NOT_FOUND"
            concepts_to_cover = [f"Notification: '{target_name}' is not in course material"]
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

        check_question = f"Would you like to solve a practice question on {target_name} or explore an example?"

        return {
            "query": query,
            "intent": intent,
            "target_name": target_name,
            "target_found": target_found,
            "teaching_stage": teaching_stage,
            "concepts_to_cover": concepts_to_cover,
            "retrieved_chunks": retrieved_chunks,
            "needs_bridge": needs_bridge,
            "check_question": check_question
        }
