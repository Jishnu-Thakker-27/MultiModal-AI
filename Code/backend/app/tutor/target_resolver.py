import logging
import re
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.database.models import ConceptGraphNode, DocumentChunk
from app.knowledge.graph_manager import GraphManager
from app.database.repositories import Repository

logger = logging.getLogger("study_companion.tutor.target_resolver")

def generate_concept_aliases(concept_name: str) -> List[str]:
    """
    Generates flexible lexical variants and concept roots for a target topic name.
    Normalizes hyphens, plurals, and strips noise suffixes (method, formula, technique, etc.).
    """
    name_clean = concept_name.strip().lower()
    aliases = {name_clean}

    # 1. Normalize hyphens and underscores
    no_hyphens = re.sub(r'[-_]', ' ', name_clean)
    aliases.add(no_hyphens)

    # 2. Strip noise suffixes to derive root concept (e.g. "forward difference method" -> "forward difference")
    root_concept = re.sub(r'\b(method|formula|technique|procedure|algorithm|operator|theorem|rule|equation|system|model)\b', '', no_hyphens, flags=re.IGNORECASE).strip()
    if root_concept and len(root_concept) > 2:
        aliases.add(root_concept)

    # 3. Add hyphenated root variants
    if ' ' in root_concept:
        aliases.add(root_concept.replace(' ', '-'))

    # 4. Plural variations for all derived aliases
    for a in list(aliases):
        if a.endswith('s'):
            aliases.add(a[:-1])
        else:
            aliases.add(a + 's')

    return list(aliases)

class TargetResolver:
    """
    Generalized Target Concept Resolver & Coverage Evaluator.
    Performs flexible query concept normalization and defers final coverage decisions
    until after document-wide hybrid retrieval.
    """
    def __init__(self, db: Session):
        self.db = db
        self.graph_mgr = GraphManager(db)
        self.repo = Repository(db)

    def extract_raw_target_candidate(self, query: str) -> str:
        q = query.strip()
        patterns = [
            r'^(?:explain|teach|tell|what is|what are|define|meaning of|overview of|introduction to|how does|how do|why does|why do|can you explain|solve)\s+(?:me\s+|us\s+|about\s+|a\s+|an\s+|the\s+)*(.+?)(?:\s+work|\s+works|\s+algorithm|\s+concept|\?|\!|$)',
            r'^(?:explain|teach|define)\s+(?:me\s+|us\s+|about\s+)*(.*?)$',
            r'^(.+?)\s+(?:definition|explanation|overview|tutorial)\b'
        ]

        candidate = ""
        for p in patterns:
            match = re.search(p, q, re.IGNORECASE)
            if match:
                res = match.group(1).strip(' ?!.').title()
                res_clean = re.sub(r'^(Me|Us|About)\s+', '', res, flags=re.I).strip()
                if len(res_clean) > 1 and res_clean.lower() not in ["it", "this", "that", "them", "again", "concept", "topic"]:
                    candidate = res_clean
                    break

        if not candidate:
            candidate = re.sub(r'^(Me|Us|About)\s+', '', q.strip(' ?!.'), flags=re.I).strip().title()

        return candidate

    def resolve_target_concept(
        self,
        course_id: Optional[str],
        query: str,
        conversation_id: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        raw_target = self.extract_raw_target_candidate(query)
        aliases = generate_concept_aliases(raw_target)

        # Derive root term for target_name (e.g. "Forward Difference Method" -> "Forward Difference")
        target_root = re.sub(r'\b(method|formula|technique|procedure|algorithm|operator|theorem|rule|equation)\b', '', raw_target, flags=re.I).strip()
        display_target = target_root if target_root else raw_target

        is_follow_up = False
        if conversation_history:
            q_lower = query.strip().lower()
            pronouns = ["it", "this", "that", "them", "the third rod", "again", "why", "how is"]
            if any(p in q_lower for p in pronouns) or len(q_lower.split()) <= 4:
                for msg in reversed(conversation_history):
                    role = (msg.get("role") or msg.get("sender") or "").lower()
                    if role not in ["user", "student"]:
                        continue

                    content = msg.get("content", "")
                    if content and not content.lower().startswith("why") and not content.lower().startswith("how"):
                        prev_target = self.extract_raw_target_candidate(content)
                        if prev_target and len(prev_target) > 1:
                            raw_target = prev_target
                            aliases = generate_concept_aliases(raw_target)
                            display_target = raw_target
                            is_follow_up = True
                            break

        allowed_doc_ids = []
        if conversation_id:
            allowed_doc_ids = self.repo.get_conversation_document_ids(conversation_id)

        if allowed_doc_ids:
            chunks = self.db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(allowed_doc_ids)).all()
        elif course_id:
            chunks = self.db.query(DocumentChunk).filter(DocumentChunk.course_id == course_id).all()
        else:
            chunks = self.db.query(DocumentChunk).all()

        matching_chunks = []
        definition_chunks = []
        subtopic_chunks = []

        for c in chunks:
            content_lower = c.content.lower()
            content_norm = re.sub(r'[-_]', ' ', content_lower)

            # Flexible alias or root concept match
            if any(alias in content_lower or alias in content_norm for alias in aliases):
                matching_chunks.append(c)

                if any(def_kw in content_lower for def_kw in ["is defined as", "definition of", "what is", "is a linear", "is a self-balancing", "is a tree"]):
                    definition_chunks.append(c)
                elif any(sub_kw in content_lower for sub_kw in ["deletion", "insertion", "operation", "search", "traversal"]):
                    subtopic_chunks.append(c)

        cid = course_id or "default_course"
        target_node = self.graph_mgr.find_concept_by_name(cid, display_target)
        if target_node and allowed_doc_ids and target_node.document_id not in allowed_doc_ids:
            target_node = None

        target_found = (len(matching_chunks) > 0) or (target_node is not None)

        if not target_found:
            coverage_state = "STATE_A_NOT_FOUND"
        elif len(definition_chunks) > 0 or (target_node and target_node.concept_type in ["definition", "principle"]):
            coverage_state = "STATE_C_SUFFICIENT_INFO"
        elif len(subtopic_chunks) > 0:
            coverage_state = "STATE_B_PARTIAL_INFO"
        else:
            coverage_state = "STATE_C_SUFFICIENT_INFO"

        logger.info(f"TargetResolver: query='{query}' -> target='{display_target}', aliases={aliases[:4]}, candidate_chunks={len(matching_chunks)}")

        return {
            "target_name": display_target,
            "raw_target": raw_target,
            "aliases": aliases,
            "target_found": target_found,
            "target_node": target_node,
            "target_coverage_state": coverage_state,
            "subtopic_chunks_count": len(subtopic_chunks),
            "definition_chunks_count": len(definition_chunks),
            "is_follow_up": is_follow_up
        }
