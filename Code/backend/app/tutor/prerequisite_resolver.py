from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.knowledge.graph_manager import GraphManager
from app.database.models import ConceptGraphNode, ConceptMastery

class PrerequisiteResolver:
    def __init__(self, db: Session):
        self.db = db
        self.graph_mgr = GraphManager(db)

    def resolve_pedagogical_context(
        self,
        course_id: str,
        user_id: str,
        query: str,
        intent: str
    ) -> Dict[str, Any]:
        """
        Resolves target concept, prerequisite dependency tree, and student knowledge state.
        Determines whether foundational teaching or prerequisite bridging is required.
        """
        target_node = self.graph_mgr.find_concept_by_name(course_id, query)
        
        prereqs = []
        missing_prereqs = []
        target_mastery = 0.0

        if target_node:
            prereqs = self.graph_mgr.get_prerequisites_for_concept(target_node.id)

            # Check student mastery for target concept
            t_m = self.db.query(ConceptMastery).filter(
                ConceptMastery.user_id == user_id,
                ConceptMastery.concept_id == target_node.id
            ).first()
            if t_m:
                target_mastery = t_m.mastery_score

            # Check student mastery for each prerequisite
            for p in prereqs:
                p_m = self.db.query(ConceptMastery).filter(
                    ConceptMastery.user_id == user_id,
                    ConceptMastery.concept_id == p.id
                ).first()
                p_score = p_m.mastery_score if p_m else 0.0
                
                if p_score < 0.5:
                    missing_prereqs.append({
                        "node": p,
                        "mastery_score": p_score
                    })

        # Decision matrix for teaching plan
        needs_prereq_bridge = False
        if intent in ["LEARN_CONCEPT", "SOLVE_PROBLEM", "PROCEDURE", "EXPLAIN_CONCEPT"]:
            if missing_prereqs and target_mastery < 0.6:
                needs_prereq_bridge = True

        return {
            "target_concept": target_node,
            "prerequisites": prereqs,
            "missing_prerequisites": [m["node"] for m in missing_prereqs],
            "target_mastery": target_mastery,
            "needs_prereq_bridge": needs_prereq_bridge,
            "is_introductory_request": (intent == "LEARN_CONCEPT" or (target_node and target_node.concept_type in ["definition", "principle"]))
        }
