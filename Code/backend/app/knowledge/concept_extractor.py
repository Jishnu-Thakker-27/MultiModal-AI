import logging
import re
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.config import settings
from app.knowledge.graph_manager import GraphManager

logger = logging.getLogger("study_companion.knowledge.concept_extractor")

# Educational Concept Extraction Engine
def extract_and_build_concept_graph(
    db: Session,
    course_id: str,
    document_id: str,
    extracted_items: List[Dict[str, Any]],
    source_type: str
):
    """
    Extracts structured educational taxonomy from document pages/slides/video transcripts.
    Dynamically identifies concept types (definition, principle, operation, algorithm, application)
    and constructs explicit prerequisite/dependency relationships.
    """
    graph_mgr = GraphManager(db)
    created_nodes = []

    # 1. Parse each page/slide/segment item sequentially
    for order_idx, item in enumerate(extracted_items):
        text = item.get("text", "").strip()
        if not text:
            continue

        page_no = item.get("page_number")
        slide_no = item.get("slide_number")
        start_t = item.get("start_time")
        end_t = item.get("end_time")

        # Heuristic & Regex Educational Concept Discovery
        lines = text.split('\n')
        for line in lines:
            line_str = line.strip()
            if len(line_str) < 4 or len(line_str) > 120:
                continue

            # Identify Concept Types
            concept_type = None
            if re.search(r'\b(definition|what is|is defined as|represents|linear list|intro|introduction)\b', line_str, re.I):
                concept_type = "definition"
            elif re.search(r'\b(principle|lifo|fifo|invariant|property|rule)\b', line_str, re.I):
                concept_type = "principle"
            elif re.search(r'\b(push|pop|peek|enqueue|dequeue|insert|delete|operation|top pointer)\b', line_str, re.I):
                concept_type = "operation"
            elif re.search(r'\b(algorithm|procedure|steps|infix|postfix|prefix|conversion)\b', line_str, re.I):
                concept_type = "algorithm"
            elif re.search(r'\b(application|use case|example|expression|evaluation)\b', line_str, re.I):
                concept_type = "application"
            elif re.search(r'\b(formula|equation|complexity|o\(|th=)\b', line_str, re.I):
                concept_type = "formula"

            if concept_type:
                # Clean concept name string
                name_clean = re.sub(r'^(unit[-\s]\d+|chapter\s+\d+|section\s+\d+|\d+[\.\)]|\*|-|•)\s*', '', line_str, flags=re.I).strip()
                name_clean = name_clean.split(':')[0].split('—')[0].strip()
                
                if len(name_clean) > 3 and len(name_clean) < 60:
                    node = graph_mgr.create_concept_node(
                        course_id=course_id,
                        document_id=document_id,
                        name=name_clean,
                        concept_type=concept_type,
                        description=line_str,
                        source_type=source_type,
                        page_number=page_no,
                        slide_number=slide_no,
                        start_time=start_t,
                        end_time=end_t,
                        document_order=order_idx,
                        summary_excerpt=text[:250],
                        keywords=[w.lower() for w in name_clean.split() if len(w) > 3]
                    )
                    created_nodes.append(node)

    # 2. Automatically link sequential prerequisite relationships
    # Early document concepts (definition/principle) are prerequisites of later operations & algorithms
    definitions = [n for n in created_nodes if n.concept_type in ["definition", "principle"]]
    operations = [n for n in created_nodes if n.concept_type == "operation"]
    algorithms = [n for n in created_nodes if n.concept_type in ["algorithm", "application"]]

    for d_node in definitions:
        for op_node in operations:
            if op_node.document_order >= d_node.document_order:
                graph_mgr.add_relationship(d_node.id, op_node.id, "prerequisite_of")

    for op_node in operations:
        for alg_node in algorithms:
            if alg_node.document_order >= op_node.document_order:
                graph_mgr.add_relationship(op_node.id, alg_node.id, "prerequisite_of")

    for d_node in definitions:
        for alg_node in algorithms:
            if alg_node.document_order > d_node.document_order:
                graph_mgr.add_relationship(d_node.id, alg_node.id, "prerequisite_of")

    logger.info(f"Built concept graph for document {document_id}: {len(created_nodes)} concept nodes created.")
    return created_nodes
