import logging
import re
import unicodedata
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.database.models import ConceptGraphNode, DocumentChunk, Document
from app.knowledge.graph_manager import GraphManager
from app.database.repositories import Repository

logger = logging.getLogger("study_companion.tutor.target_resolver")

def is_document_overview_query(query: str) -> bool:
    """
    Detects if query is requesting a broad document, chapter, or syllabus overview/summary.
    """
    q = query.strip().lower()
    patterns = [
        r'\b(?:overview|summary|summarize|table of contents|outline|syllabus|key concepts|main topics)\b.*?\b(?:document|material|pdf|chapter|notes|unit|course|uploaded|text|file)\b',
        r'\b(?:document|material|pdf|chapter|notes|unit|course|uploaded|text|file)\b.*?\b(?:overview|summary|summarize|outline|topics|concepts)\b',
        r'^(?:provide|give|show|generate)?\s*(?:me\s+|an?\s+)*(?:overview|summary|recap|outline)\s*(?:of|for)?\s*(?:the|this|uploaded)?\s*(?:document|chapter|unit|material|file|topics|key concepts)?',
        r'\b(?:main topics|key concepts|what does this document cover|what is covered in this document|what is this document about|what topics are in this document)\b'
    ]
    overview_phrases = {
        "explain me", "explain to me", "explain", "teach me", "start", "begin",
        "explain this", "explain pdf", "explain this pdf", "explain this topic",
        "explain this material", "explain chapter", "explain this chapter",
        "tell me about this", "what is this about", "teach this", "teach this to me"
    }
    if q in overview_phrases or any(q.startswith(p) for p in ["explain this", "explain pdf", "explain the pdf", "explain my pdf", "explain document", "explain me "]):
        return True
    return any(re.search(p, q, re.IGNORECASE) for p in patterns)

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

def normalize_common_math_typos(text: str) -> str:
    replacements = [
        (r'\bdiffernce\b', 'difference'),
        (r'\bdivide\s+difference\b', 'divided difference'),
        (r'\bformulaa\b', 'formula'),
        (r'\binterpolarion\b', 'interpolation'),
        (r'\binterploation\b', 'interpolation'),
        (r'\bpolynomail\b', 'polynomial'),
        (r'\bevalute\b', 'evaluate'),
    ]
    res = text
    for pat, rep in replacements:
        res = re.sub(pat, rep, res, flags=re.IGNORECASE)
    return res

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
        q = normalize_common_math_typos(query.strip())
        if is_document_overview_query(q):
            return "Document Overview"

        patterns = [
            r'^(?:explain|teach|tell|what is|what are|define|meaning of|overview of|introduction to|how does|how do|why does|why do|can you explain|solve|provide|give|show)\s+(?:me\s+|us\s+|about\s+|a\s+|an\s+|the\s+)*(.+?)(?:\s+work|\s+works|\s+algorithm|\s+concept|\?|\!|$)',
            r'^(?:explain|teach|define)\s+(?:me\s+|us\s+|about\s+)*(.*?)$',
            r'^(?!provide|give|show|generate|write|tell|explain|summarize)(.+?)\s+(?:definition|explanation|overview|tutorial)\b'
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
        normalized_query = normalize_common_math_typos(query)
        allowed_doc_ids = []
        if conversation_id:
            allowed_doc_ids = self.repo.get_conversation_document_ids(conversation_id)

        # Check if query is explicitly asking for whole document/chapter overview
        if is_document_overview_query(normalized_query):
            doc_title = "Document Overview"
            if allowed_doc_ids:
                doc = self.db.query(Document).filter(Document.id.in_(allowed_doc_ids)).first()
                if doc and doc.title:
                    clean_title = re.sub(r'\.(pdf|pptx|docx|txt)$', '', doc.title, flags=re.I)
                    clean_title = re.sub(r'[-_–]', ' ', clean_title).strip()
                    doc_title = clean_title

            logger.info(f"TargetResolver: Query classified as DOCUMENT_OVERVIEW for '{doc_title}'")
            return {
                "target_name": doc_title,
                "raw_target": doc_title,
                "aliases": [doc_title.lower(), "overview", "summary", "chapter", "unit"],
                "target_found": True,
                "target_node": None,
                "target_coverage_state": "STATE_C_SUFFICIENT_INFO",
                "subtopic_chunks_count": 10,
                "definition_chunks_count": 10,
                "is_follow_up": False,
                "is_document_overview": True
            }

        raw_target = self.extract_raw_target_candidate(normalized_query)
        aliases = generate_concept_aliases(raw_target)

        # Derive root term for target_name (e.g. "Forward Difference Method" -> "Forward Difference")
        target_root = re.sub(r'\b(method|formula|technique|procedure|algorithm|operator|theorem|rule|equation)\b', '', raw_target, flags=re.I).strip()
        display_target = target_root if target_root else raw_target

        is_follow_up = False
        follow_up_phrases = [
            "partial idea", "understand the hints", "completely new", "skip hints",
            "move to next", "move to the next", "let's start", "guide me", "ready!", "ready",
            "start from", "foundational basics", "show a quick", "i have a question",
            "i understand", "next basic topic"
        ]
        q_lower = normalized_query.strip().lower()
        is_nav_response = any(p in q_lower for p in follow_up_phrases)

        if conversation_history:
            pronouns = ["it", "this", "that", "them", "again", "why is that", "explain more", "continue", "how so"]
            domain_math_words = [
                "difference", "interpolation", "divided", "forward", "backward", "formula",
                "method", "table", "bisection", "root", "matrix", "integration", "newton",
                "simpson", "trapezoidal", "iteration", "secant", "lagrange"
            ]
            has_pronoun = any(re.search(r'\b' + re.escape(p) + r'\b', q_lower) for p in pronouns)
            has_domain_word = any(w in q_lower for w in domain_math_words)

            # Treat as follow-up if query explicitly refers to previous context OR is a navigation/comfort response
            if (has_pronoun or is_nav_response or q_lower in ["why?", "how?", "explain again", "more", "tell me more"]) and (is_nav_response or not has_domain_word):
                for msg in reversed(conversation_history):
                    role = (msg.get("role") or msg.get("sender") or "").lower()
                    if role not in ["user", "student"]:
                        continue

                    content = msg.get("content", "")
                    if content:
                        c_lower = content.lower()
                        if not any(p in c_lower for p in follow_up_phrases) and not c_lower.startswith("why") and not c_lower.startswith("how"):
                            prev_target = self.extract_raw_target_candidate(content)
                            if prev_target and len(prev_target) > 1:
                                raw_target = prev_target
                                aliases = generate_concept_aliases(raw_target)
                                display_target = raw_target
                                is_follow_up = True
                                break

        # Fallback to conversation topic_name if target resolved to a navigation response
        if is_nav_response and not is_follow_up and conversation_id:
            conv = self.repo.get_conversation(conversation_id)
            if conv and conv.topic_name and conv.topic_name not in ["General", "New Study Session"]:
                raw_target = conv.topic_name
                aliases = generate_concept_aliases(raw_target)
                display_target = raw_target
                is_follow_up = True

        if allowed_doc_ids:
            chunks = self.db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(allowed_doc_ids)).all()
        elif course_id:
            chunks = self.db.query(DocumentChunk).filter(DocumentChunk.course_id == course_id).all()
        else:
            chunks = self.db.query(DocumentChunk).all()

        matching_chunks = []
        definition_chunks = []
        subtopic_chunks = []

        # Extract substantive target words for token-level matching
        target_tokens = [
            w for w in re.sub(r'[^a-zA-Z0-9]+', ' ', display_target.lower()).split()
            if len(w) > 3 and w not in ["method", "formula", "rule", "technique", "what", "explain"]
        ]

        for c in chunks:
            content_lower = unicodedata.normalize('NFKD', c.content or '').lower()
            content_norm = re.sub(r'[-_]', ' ', content_lower)

            # 1. Flexible alias or root concept match
            has_alias_match = any(alias in content_lower or alias in content_norm for alias in aliases)
            # 2. Token-level intersection match (e.g. "forward" and "difference")
            has_token_match = bool(target_tokens and all(tok in content_lower for tok in target_tokens))

            if has_alias_match or has_token_match:
                matching_chunks.append(c)

                if any(def_kw in content_lower for def_kw in ["is defined as", "definition of", "what is", "are defined as", "are called", "denoted by"]):
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
