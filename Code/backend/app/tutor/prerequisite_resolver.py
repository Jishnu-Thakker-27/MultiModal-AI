import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.knowledge.graph_manager import GraphManager
from app.database.models import ConceptGraphNode, ConceptMastery
from app.tutor.target_resolver import TargetResolver

logger = logging.getLogger("study_companion.tutor.prerequisite_resolver")

class PrerequisiteResolver:
    """
    Evidence-based Prerequisite & Context Resolver.
    First resolves the explicit target concept via TargetResolver,
    then checks if explicit prerequisite dependencies exist in the course graph,
    and evaluates student concept mastery before deciding whether prerequisite bridging is required.
    """
    def __init__(self, db: Session):
        self.db = db
        self.graph_mgr = GraphManager(db)
        self.target_resolver = TargetResolver(db)

    def resolve_pedagogical_context(
        self,
        course_id: str,
        user_id: str,
        query: str,
        intent: str,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        target_info = self.target_resolver.resolve_target_concept(
            course_id=course_id,
            query=query,
            conversation_history=conversation_history
        )

        target_name = target_info["target_name"]
        target_found = target_info["target_found"]
        target_node = target_info["target_node"]

        prereqs = []
        missing_prereqs = []
        target_mastery = 0.0

        if target_node:
            # Retrieve evidence-based prerequisites from course knowledge graph ONLY
            prereqs = self.graph_mgr.get_prerequisites_for_concept(target_node.id)

            t_m = self.db.query(ConceptMastery).filter(
                ConceptMastery.user_id == user_id,
                ConceptMastery.concept_id == target_node.id
            ).first()
            if t_m:
                target_mastery = t_m.mastery_score

            # Check student mastery for each valid prerequisite
            for p in prereqs:
                p_m = self.db.query(ConceptMastery).filter(
                    ConceptMastery.user_id == user_id,
                    ConceptMastery.concept_id == p.id
                ).first()
                p_score = p_m.mastery_score if p_m else 0.0

                # Only include prerequisite if student mastery is low (< 0.5)
                if p_score < 0.5:
                    missing_prereqs.append({
                        "node": p,
                        "mastery_score": p_score
                    })

        # Decision matrix: only bridge if missing prerequisites ACTUALLY exist for this concept
        needs_prereq_bridge = False
        if missing_prereqs and target_mastery < 0.6:
            needs_prereq_bridge = True

        return {
            "target_name": target_name,
            "target_found": target_found,
            "target_concept": target_node,
            "prerequisites": prereqs,
            "missing_prerequisites": [m["node"] for m in missing_prereqs],
            "target_mastery": target_mastery,
            "needs_prereq_bridge": needs_prereq_bridge,
            "is_introductory_request": (intent in ["LEARN_CONCEPT", "DEFINITION"]),
            "is_follow_up": target_info.get("is_follow_up", False)
        }
