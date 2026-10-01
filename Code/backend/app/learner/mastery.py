def calculate_updated_mastery(
    current_mastery: float,
    is_correct: bool,
    alpha: float = 0.3
) -> float:
    """
    Calculates updated topic mastery using a transparent exponential moving average model.
    alpha: learning rate parameter (0.3 means 30% weight to newest response).
    """
    target = 100.0 if is_correct else 0.0
    new_mastery = (1 - alpha) * current_mastery + alpha * target
    return round(new_mastery, 1)

def detect_weak_topics(topic_masteries: list) -> list:
    """
    Identifies topics with mastery < 50%.
    """
    weak = []
    for item in topic_masteries:
        if item.get("mastery_score", 0.0) < 50.0:
            weak.append(item.get("topic_name", "Unknown Topic"))
    return weak
