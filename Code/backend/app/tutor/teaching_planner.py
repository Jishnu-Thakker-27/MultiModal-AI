from typing import List, Dict, Any

class TeachingPlanner:
    def create_plan(
        self,
        query: str,
        intent_info: Dict[str, Any],
        pedagogical_context: Dict[str, Any],
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Constructs an explicit pedagogical Teaching Plan defining:
        1. Teaching sequence (Foundations First vs Direct Answer vs Prerequisite Bridge)
        2. Concepts to explain in order
        3. Source passages assigned to each step
        4. Interactive follow-up check
        """
        intent = intent_info.get("intent", "EXPLAIN_CONCEPT")
        target_node = pedagogical_context.get("target_concept")
        missing_prereqs = pedagogical_context.get("missing_prerequisites", [])
        needs_bridge = pedagogical_context.get("needs_prereq_bridge", False)
        is_intro = pedagogical_context.get("is_introductory_request", False)

        teaching_stage = "DIRECT_EXPLANATION"
        concepts_to_cover = []

        if is_intro or intent == "LEARN_CONCEPT":
            teaching_stage = "FOUNDATIONS_FIRST"
            concepts_to_cover = [
                "1. Fundamental Definition & LIFO Principle",
                "2. Core Pointer / Index (TOP)",
                "3. Primary Operations (PUSH and POP)"
            ]
        elif needs_bridge and missing_prereqs:
            teaching_stage = "PREREQUISITE_BRIDGE"
            p_names = ", ".join([p.name for p in missing_prereqs[:2]])
            concepts_to_cover = [
                f"1. Prerequisite Foundation ({p_names})",
                f"2. Target Concept Explanation ({target_node.name if target_node else 'Target Concept'})"
            ]
        else:
            teaching_stage = "DIRECT_EXPLANATION"
            if target_node:
                concepts_to_cover = [f"Direct Explanation of {target_node.name}"]
            else:
                concepts_to_cover = ["Direct Source Explanation"]

        # Check question for active student engagement
        target_name = target_node.name if target_node else "this topic"
        check_question = f"Would you like to practice a quick question on {target_name} or explore how it is applied?"

        return {
            "query": query,
            "intent": intent,
            "teaching_stage": teaching_stage,
            "concepts_to_cover": concepts_to_cover,
            "retrieved_chunks": retrieved_chunks,
            "needs_bridge": needs_bridge,
            "check_question": check_question
        }
