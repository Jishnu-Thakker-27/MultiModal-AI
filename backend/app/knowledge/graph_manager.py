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
        keywords: Optional[List[str]] = None,
        auto_commit: bool = True
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
            if auto_commit:
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
        if auto_commit:
            self.db.commit()
            self.db.refresh(node)
        return node

    def add_relationship(
        self,
        source_concept_id: str,
        target_concept_id: str,
        relationship_type: str = "prerequisite_of",
        provenance_doc_id: Optional[str] = None,
        page_number: Optional[int] = None,
        source_chunk_id: Optional[str] = None,
        confidence: float = 1.0,
        auto_commit: bool = True
    ) -> Optional[ConceptRelationship]:
        if source_concept_id == target_concept_id:
            return None

        existing = self.db.query(ConceptRelationship).filter(
            ConceptRelationship.source_concept_id == source_concept_id,
            ConceptRelationship.target_concept_id == target_concept_id,
            ConceptRelationship.relationship_type == relationship_type
        ).first()

        if existing:
            # Update provenance if previously missing
            if provenance_doc_id and not existing.provenance_doc_id:
                existing.provenance_doc_id = provenance_doc_id
            if page_number and not existing.page_number:
                existing.page_number = page_number
            if source_chunk_id and not existing.source_chunk_id:
                existing.source_chunk_id = source_chunk_id
            if auto_commit:
                self.db.commit()
                self.db.refresh(existing)
            return existing

        rel = ConceptRelationship(
            source_concept_id=source_concept_id,
            target_concept_id=target_concept_id,
            relationship_type=relationship_type,
            provenance_doc_id=provenance_doc_id,
            page_number=page_number,
            source_chunk_id=source_chunk_id,
            confidence=confidence
        )
        self.db.add(rel)
        if auto_commit:
            self.db.commit()
            self.db.refresh(rel)
        return rel

    def get_prerequisites_for_concept(self, concept_id: str) -> List[ConceptGraphNode]:
        """
        Retrieves all prerequisite concept nodes required before learning the given target concept.
        """
        rels = self.db.query(ConceptRelationship).filter(
            ConceptRelationship.target_concept_id == concept_id,
            ConceptRelationship.relationship_type.in_(["prerequisite_of", "follows", "part_of", "depends_on"])
        ).all()

        prereq_ids = [r.source_concept_id for r in rels]
        if not prereq_ids:
            return []

        return self.db.query(ConceptGraphNode).filter(ConceptGraphNode.id.in_(prereq_ids)).order_by(ConceptGraphNode.document_order.asc()).all()

    def get_related_graph_neighborhood(
        self,
        concept_id: str,
        max_hops: int = 1
    ) -> Dict[str, Any]:
        """
        Traverses bounded 1-to-2 hop conceptual neighborhood around a target node.
        Returns:
            - target_node
            - prerequisites (incoming prerequisite/depends_on)
            - parent_containers (part_of, contains)
            - related_concepts (related_to, follows)
            - chunk_ids (direct and 1-hop connected chunk IDs)
        """
        target = self.db.query(ConceptGraphNode).filter(ConceptGraphNode.id == concept_id).first()
        if not target:
            return {
                "target_node": None,
                "prerequisites": [],
                "parents": [],
                "related": [],
                "connected_chunk_ids": []
            }

        # 1-Hop incoming relationships
        incoming_rels = self.db.query(ConceptRelationship).filter(
            ConceptRelationship.target_concept_id == concept_id
        ).all()

        # 1-Hop outgoing relationships
        outgoing_rels = self.db.query(ConceptRelationship).filter(
            ConceptRelationship.source_concept_id == concept_id
        ).all()

        prereq_ids = set()
        parent_ids = set()
        related_ids = set()
        chunk_ids = set()

        for r in incoming_rels:
            if r.source_chunk_id:
                chunk_ids.add(r.source_chunk_id)
            if r.relationship_type in ["prerequisite_of", "depends_on"]:
                prereq_ids.add(r.source_concept_id)
            elif r.relationship_type in ["contains", "part_of"]:
                parent_ids.add(r.source_concept_id)
            else:
                related_ids.add(r.source_concept_id)

        for r in outgoing_rels:
            if r.source_chunk_id:
                chunk_ids.add(r.source_chunk_id)
            if r.relationship_type in ["contains", "part_of"]:
                parent_ids.add(r.target_concept_id)
            elif r.relationship_type in ["prerequisite_of"]:
                related_ids.add(r.target_concept_id)
            else:
                related_ids.add(r.target_concept_id)

        # Pull chunks directly indexed by target node
        direct_chunks = self.db.query(DocumentChunk).filter(
            DocumentChunk.concept_node_id == concept_id
        ).all()
        for dc in direct_chunks:
            chunk_ids.add(dc.id)

        all_node_ids = list(prereq_ids | parent_ids | related_ids)
        neighbor_nodes = {}
        if all_node_ids:
            nodes = self.db.query(ConceptGraphNode).filter(ConceptGraphNode.id.in_(all_node_ids)).all()
            neighbor_nodes = {n.id: n for n in nodes}

        # Also pull chunks linked to 1-hop prerequisites
        if prereq_ids:
            prereq_chunks = self.db.query(DocumentChunk).filter(
                DocumentChunk.concept_node_id.in_(list(prereq_ids))
            ).all()
            for pc in prereq_chunks:
                chunk_ids.add(pc.id)

        return {
            "target_node": target,
            "prerequisites": [neighbor_nodes[pid] for pid in prereq_ids if pid in neighbor_nodes],
            "parents": [neighbor_nodes[pid] for pid in parent_ids if pid in neighbor_nodes],
            "related": [neighbor_nodes[rid] for rid in related_ids if rid in neighbor_nodes],
            "connected_chunk_ids": list(chunk_ids)
        }

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
