import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "syncpad_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task
def process_document_ai_summary(document_id: str, text: str):
    """
    Placeholder task for AI processing.
    In the real implementation, this will call the OpenAI API.
    """
    # Simulate processing
    import time
    time.sleep(2)
    return {"status": "success", "document_id": document_id, "summary": "This is an AI summary placeholder."}
