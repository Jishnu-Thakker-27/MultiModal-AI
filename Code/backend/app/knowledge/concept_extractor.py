import logging
import re
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.knowledge.graph_manager import GraphManager

logger = logging.getLogger("study_companion.knowledge.concept_extractor")

def extract_and_build_concept_graph(
    db: Session,
    course_id: str,
    document_id: str,
    extracted_items: List[Dict[str, Any]],
    source_type: str
):
    """
    Generalized Educational Concept Extraction Engine.
    Dynamically identifies concept types (definition, principle, operation, algorithm, application, formula)
    across ANY uploaded course material (PDF, PPT, Video) without hardcoding specific course topics.
    """
    graph_mgr = GraphManager(db)
    created_nodes = []

    for order_idx, item in enumerate(extracted_items):
        text = item.get("text", "").strip()
        if not text:
            continue

        page_no = item.get("page_number")
        slide_no = item.get("slide_number")
        start_t = item.get("start_time")
        end_t = item.get("end_time")

        lines = text.split('\n')
        for line in lines:
            line_str = line.strip()
            if len(line_str) < 4 or len(line_str) > 120:
                continue

            concept_type = None
            # Generalized educational taxonomy rules
            if re.search(r'\b(definition|what is|defined as|represents|overview|introduction|is a|are a)\b', line_str, re.I):
                concept_type = "definition"
            elif re.search(r'\b(principle|invariant|property|rule|law|axiom|theorem|characteristic)\b', line_str, re.I):
                concept_type = "principle"
            elif re.search(r'\b(operation|method|function|procedure|action|process|step)\b', line_str, re.I):
                concept_type = "operation"
            elif re.search(r'\b(algorithm|technique|methodology|approach|routine|system)\b', line_str, re.I):
                concept_type = "algorithm"
            elif re.search(r'\b(application|use case|example|sample|illustration|case study)\b', line_str, re.I):
                concept_type = "application"
            elif re.search(r'\b(formula|equation|complexity|o\(|th=|\=)\b', line_str, re.I):
                concept_type = "formula"

            if concept_type:
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

    # Link sequential prerequisite and container relationships with exact provenance
    definitions = [n for n in created_nodes if n.concept_type in ["definition", "principle"]]
    operations = [n for n in created_nodes if n.concept_type == "operation"]
    algorithms = [n for n in created_nodes if n.concept_type in ["algorithm", "application"]]
    formulas = [n for n in created_nodes if n.concept_type == "formula"]

    # 1. Definitions are prerequisites of operations
    for d_node in definitions:
        for op_node in operations:
            if op_node.document_order >= d_node.document_order:
                graph_mgr.add_relationship(
                    source_concept_id=d_node.id,
                    target_concept_id=op_node.id,
                    relationship_type="prerequisite_of",
                    provenance_doc_id=document_id,
                    page_number=op_node.page_number or d_node.page_number,
                    confidence=0.9
                )

    # 2. Operations are prerequisites of algorithms
    for op_node in operations:
        for alg_node in algorithms:
            if alg_node.document_order >= op_node.document_order:
                graph_mgr.add_relationship(
                    source_concept_id=op_node.id,
                    target_concept_id=alg_node.id,
                    relationship_type="prerequisite_of",
                    provenance_doc_id=document_id,
                    page_number=alg_node.page_number or op_node.page_number,
                    confidence=0.85
                )

    # 3. Formulas explain or belong to operations/algorithms
    for f_node in formulas:
        for target_node in (operations + algorithms):
            if abs(f_node.document_order - target_node.document_order) <= 1:
                graph_mgr.add_relationship(
                    source_concept_id=f_node.id,
                    target_concept_id=target_node.id,
                    relationship_type="explained_by",
                    provenance_doc_id=document_id,
                    page_number=f_node.page_number,
                    confidence=0.95
                )

    logger.info(f"Generalized concept extractor built {len(created_nodes)} concept nodes with provenance for document {document_id}")
    return created_nodes
