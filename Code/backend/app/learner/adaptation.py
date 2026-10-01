from typing import List, Dict, Any

def prioritize_weak_topics(
    topics: List[Dict[str, Any]],
    mastery_map: Dict[str, float]
) -> List[Dict[str, Any]]:
    """
    Sorts topics prioritizing lower mastery scores for adaptive practice.
    """
    sorted_topics = sorted(
        topics,
        key=lambda t: mastery_map.get(t.get("id"), 0.0)
    )
    return sorted_topics

def build_adaptive_tutor_context(weak_topics: List[str]) -> str:
    if not weak_topics:
        return "Student mastery is strong across all topics."
    return f"Learner Model Alert: Student currently shows lower mastery (<50%) in: {', '.join(weak_topics)}. Adapt explanations to provide supportive foundational detail when discussing these topics."
