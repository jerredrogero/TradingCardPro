import logging
from django.utils import timezone
from datetime import timedelta
from apps.channels.models import ChannelIntegration
from .client import EbayClient
from .tasks import process_ebay_order

logger = logging.getLogger(__name__)

def poll_orders(integration_id):
    """
    Polls eBay for new orders and enqueues them for processing.
    """
    try:
        integration = ChannelIntegration.objects.get(id=integration_id)
        if integration.status != 'active':
            logger.info(f"Skipping poll for integration {integration_id} (status: {integration.status})")
            return
            
        client = EbayClient(integration)
        
        # Determine time window
        now = timezone.now()
        if integration.last_poll_cursor:
            # Parse from ISO 8601 string or assume it's a datetime string
            try:
                # Fallback format parsing could go here
                created_after = integration.last_poll_cursor
            except Exception:
                created_after = (now - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        else:
            # First poll, go back 1 hour
            created_after = (now - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
            
        created_before = now.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        
        limit = 50
        offset = 0
        has_more = True
        
        total_processed = 0
        
        while has_more:
            response = client.get_orders(created_after, created_before, limit=limit, offset=offset)
            if not response or 'orders' not in response:
                break
                
            orders = response['orders']
            
            for order in orders:
                # Enqueue a celery task for each order to ensure idempotency and atomic DB updates
                process_ebay_order.delay(order, integration.id)
                total_processed += 1
                
            offset += limit
            # Check pagination. EBay returns total, limit, offset, href, next, prev
            has_more = len(orders) == limit and 'next' in response
            
        # Update last poll cursor
        integration.last_poll_cursor = created_before
        integration.save()
        
        logger.info(f"Polled {total_processed} orders for integration {integration_id}")
        return total_processed
        
    except Exception as e:
        logger.error(f"Error polling orders for integration {integration_id}: {e}")
        # Log to SyncJob for visibility if it fails completely
        from apps.channels.models import SyncJob
        SyncJob.objects.create(
            integration_id=integration_id,
            operation='poll_orders',
            direction='inbound',
            status='failed',
            error_message=str(e)
        )
