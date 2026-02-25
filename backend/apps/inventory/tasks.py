from celery import shared_task
from .services.csv_importer import CSVImporter
from .models import InventoryLot, InventoryEvent
from django.core.cache import cache

@shared_task
def parse_and_import_csv(task_id, shop_id, user_id, file_content, column_mapping):
    """
    Celery task to parse CSV in the background.
    Caches the result summary for polling by the frontend.
    """
    importer = CSVImporter(shop_id=shop_id, user_id=user_id)
    summary = importer.parse_and_import(file_content, column_mapping)
    
    # Store summary in cache for 1 hour
    cache.set(f"csv_import_{task_id}", summary, timeout=3600)
    
    return summary