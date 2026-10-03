import logging
import re
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.database.models import ConceptGraphNode, DocumentChunk
from app.knowledge.graph_manager import GraphManager

logger = logging.getLogger("study_companion.tutor.target_resolver")

class TargetResolver:
    """
    Generalized Target Concept Resolver.
    Identifies the explicit learning target from the user's query or conversation history,
    validates it against the course knowledge model and documents,
    and prevents semantic retrieval from substituting an unrelated topic.
    """
    def __init__(self, db: Session):
        self.db = db
        self.graph_mgr = GraphManager(db)

    def extract_raw_target_candidate(self, query: str) -> str:
        """
        Extracts candidate target concept string from arbitrary user query.
        Handles patterns like:
        - "Explain Tower of Hanoi" -> "Tower of Hanoi"
        - "What is Bayes theorem?" -> "Bayes Theorem"
        - "How does TCP congestion control work?" -> "TCP Congestion Control"
        - "Teach me AVL trees" -> "AVL Trees"
        - "Tell me about normalization" -> "Normalization"
        """
        q = query.strip()

        # Regex patterns for intent prefixes
        patterns = [
            r'^(?:explain|teach me|tell me about|what is|what are|define|meaning of|overview of|introduction to|how does|how do|why does|why do|can you explain|solve)\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\s+work|\s+works|\s+algorithm|\s+concept|\?|\!|$)',
            r'^(?:explain|teach|define)\s+(.+?)$',
            r'^(.+?)\s+(?:definition|explanation|overview|tutorial)\b'
        ]

        for p in patterns:
            match = re.search(p, q, re.IGNORECASE)
            if match:
                candidate = match.group(1).strip(' ?!.').title()
                # Filter out generic words
                if len(candidate) > 2 and candidate.lower() not in ["it", "this", "that", "them", "again", "concept", "topic"]:
                    return candidate

        return q.strip(' ?!.').title()

    def resolve_target_concept(
        self,
        course_id: Optional[str],
        query: str,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Resolves explicit target concept string, resolves follow-up pronouns,
        and validates against course knowledge model.
        """
        raw_target = self.extract_raw_target_candidate(query)

        # Handle follow-up query pronouns (e.g. "Why do we need the third rod?", "Explain that again")
        is_follow_up = False
        if conversation_history:
            q_lower = query.strip().lower()
            pronouns = ["it", "this", "that", "them", "the third rod", "again", "why"]
            if any(p in q_lower for p in pronouns) or len(q_lower.split()) <= 4:
                # Look back at recent user/assistant messages to infer active target
                for msg in reversed(conversation_history):
                    content = msg.get("content", "")
                    if content and not content.startswith("Why") and not content.startswith("How"):
                        prev_target = self.extract_raw_target_candidate(content)
                        if prev_target and len(prev_target) > 2:
                            raw_target = prev_target
                            is_follow_up = True
                            break

        # Validate against Knowledge Model (ConceptGraphNode)
        cid = course_id or "default_course"
        target_node = self.graph_mgr.find_concept_by_name(cid, raw_target)

        # Validate against Document Chunks if not in graph
        chunk_match = None
        if not target_node:
            chunks = self.db.query(DocumentChunk).all()
            for c in chunks:
                if raw_target.lower() in c.content.lower():
                    chunk_match = c
                    break

        target_found = (target_node is not None) or (chunk_match is not None)

        logger.info(f"TargetResolver: query='{query}' -> target='{raw_target}', found={target_found}, is_follow_up={is_follow_up}")

        return {
            "target_name": raw_target,
            "target_found": target_found,
            "target_node": target_node,
            "matched_chunk": chunk_match,
            "is_follow_up": is_follow_up
        }
