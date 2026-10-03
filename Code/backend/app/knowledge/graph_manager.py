import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.database.models import (
    ConceptGraphNode, ConceptRelationship, ConceptMastery, DocumentChunk, Course, Document
)

logger = logging.getLogger("study_companion.knowledge.graph_manager")

class GraphManager:
    def __init__(self, db: Session):
        self.db = db

    def create_concept_node(
        self,
        course_id: str,
        name: str,
        concept_type: str = "definition",
        description: str = "",
        document_id: Optional[str] = None,
        source_type: Optional[str] = None,
        page_number: Optional[int] = None,
        slide_number: Optional[int] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        document_order: int = 0,
        summary_excerpt: Optional[str] = None,
        keywords: Optional[List[str]] = None
    ) -> ConceptGraphNode:
        norm_name = name.strip().lower()
        existing = self.db.query(ConceptGraphNode).filter(
            ConceptGraphNode.course_id == course_id,
            ConceptGraphNode.normalized_name == norm_name
        ).first()

        if existing:
            # Update fields if more specific page or document info provided
            if page_number and not existing.page_number:
                existing.page_number = page_number
            if description and not existing.description:
                existing.description = description
            self.db.commit()
            self.db.refresh(existing)
            return existing

        node = ConceptGraphNode(
            course_id=course_id,
            document_id=document_id,
            name=name.strip(),
            normalized_name=norm_name,
            concept_type=concept_type,
            description=description,
            source_type=source_type,
            page_number=page_number,
            slide_number=slide_number,
            start_time=start_time,
            end_time=end_time,
            document_order=document_order,
            summary_excerpt=summary_excerpt,
            keywords=keywords or []
        )
        self.db.add(node)
        self.db.commit()
        self.db.refresh(node)
        return node

    def add_relationship(
        self,
        source_concept_id: str,
        target_concept_id: str,
        relationship_type: str = "prerequisite_of"
    ) -> Optional[ConceptRelationship]:
        if source_concept_id == target_concept_id:
            return None

        existing = self.db.query(ConceptRelationship).filter(
            ConceptRelationship.source_concept_id == source_concept_id,
            ConceptRelationship.target_concept_id == target_concept_id,
            ConceptRelationship.relationship_type == relationship_type
        ).first()

        if existing:
            return existing

        rel = ConceptRelationship(
            source_concept_id=source_concept_id,
            target_concept_id=target_concept_id,
            relationship_type=relationship_type
        )
        self.db.add(rel)
        self.db.commit()
        self.db.refresh(rel)
        return rel

    def get_prerequisites_for_concept(self, concept_id: str) -> List[ConceptGraphNode]:
        """
        Retrieves all prerequisite concept nodes required before learning the given target concept.
        """
        rels = self.db.query(ConceptRelationship).filter(
            ConceptRelationship.target_concept_id == concept_id,
            ConceptRelationship.relationship_type.in_(["prerequisite_of", "follows", "part_of"])
        ).all()

        prereq_ids = [r.source_concept_id for r in rels]
        if not prereq_ids:
            return []

        return self.db.query(ConceptGraphNode).filter(ConceptGraphNode.id.in_(prereq_ids)).order_by(ConceptGraphNode.document_order.asc()).all()

    def find_concept_by_name(self, course_id: str, query: str) -> Optional[ConceptGraphNode]:
        norm_query = query.strip().lower()
        # Direct exact or substring match
        nodes = self.db.query(ConceptGraphNode).filter(ConceptGraphNode.course_id == course_id).all()
        for n in nodes:
            if n.normalized_name == norm_query or n.normalized_name in norm_query or norm_query in n.normalized_name:
                return n
            if n.keywords and any(kw.lower() in norm_query for kw in n.keywords):
                return n
        return None

    def get_course_concept_map(self, course_id: str, user_id: str = "demo_student") -> List[Dict[str, Any]]:
        nodes = self.db.query(ConceptGraphNode).filter(
            ConceptGraphNode.course_id == course_id
        ).order_by(ConceptGraphNode.document_order.asc()).all()

        if not nodes:
            return []

        # Map user mastery
        mastery_map = {}
        masteries = self.db.query(ConceptMastery).filter(ConceptMastery.user_id == user_id).all()
        for m in masteries:
            mastery_map[m.concept_id] = m.mastery_score

        res = []
        for n in nodes:
            prereqs = self.get_prerequisites_for_concept(n.id)
            prereq_names = [p.name for p in prereqs]
            score = mastery_map.get(n.id, 0.0)

            res.append({
                "id": n.id,
                "name": n.name,
                "concept_type": n.concept_type,
                "description": n.description,
                "source_type": n.source_type,
                "page_number": n.page_number,
                "slide_number": n.slide_number,
                "start_time": n.start_time,
                "document_order": n.document_order,
                "mastery_score": round(score * 100, 1),
                "status": "mastered" if score >= 0.7 else "learning" if score >= 0.3 else "not_started",
                "prerequisites": prereq_names
            })

        return res

    def update_student_concept_mastery(self, user_id: str, concept_id: str, delta: float = 0.2):
        m = self.db.query(ConceptMastery).filter(
            ConceptMastery.user_id == user_id,
            ConceptMastery.concept_id == concept_id
        ).first()

        if not m:
            m = ConceptMastery(
                user_id=user_id,
                concept_id=concept_id,
                mastery_score=min(1.0, max(0.0, delta)),
                exposure_count=1
            )
            self.db.add(m)
        else:
            m.exposure_count += 1
            m.mastery_score = min(1.0, max(0.0, m.mastery_score + delta))

        self.db.commit()
        return m.mastery_score
