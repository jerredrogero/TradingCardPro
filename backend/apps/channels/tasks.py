import logging
from celery import shared_task
from django.utils import timezone
from django.db import transaction
from apps.channels.models import ChannelIntegration, ChannelListing, SyncJob
from apps.inventory.models import InventoryEvent, InventoryLot
from integrations.ebay.client import EbayClient
from datetime import timedelta

logger = logging.getLogger(__name__)

@shared_task
def poll_ebay_orders():
    """
    Periodic task to poll all active eBay integrations for new orders.
    Scheduled to run every 5 minutes in Celery Beat.
    """
    active_integrations = ChannelIntegration.objects.filter(
        provider='ebay', 
        status='active'
    )
    
    for integration in active_integrations:
        try:
            client = EbayClient(integration)
            
            # Start polling from the last cursor, or 24 hours ago if none exists
            from_time = integration.last_poll_cursor
            if not from_time:
                from_time = (timezone.now() - timedelta(days=1)).isoformat()
                
            response = client.get_orders(created_time_from=from_time)
            
            if response and 'orders' in response:
                orders = response['orders']
                for order in orders:
                    process_ebay_order.delay(order, integration.id)
                    
            integration.last_poll_cursor = timezone.now().isoformat()
            integration.save(update_fields=['last_poll_cursor'])
            
        except Exception as e:
            logger.error(f"Failed to poll eBay orders for integration {integration.id}: {e}")

@shared_task
def process_ebay_order(order_data, integration_id):
    """
    Idempotent order processing for eBay.
    """
    order_id = order_data.get('orderId')
    if not order_id:
        logger.error(f"Received order without orderId for integration {integration_id}")
        return

    # Check if this order is already processed at a high level
    # We will also enforce idempotency at the line item level
    line_items = order_data.get('lineItems', [])
    
    for item in line_items:
        line_item_id = item.get('lineItemId')
        # We use lineItemId as the unique provider_event_id
        provider_event_id = f"ebay_order_{order_id}_{line_item_id}"
        
        # Check idempotency
        if InventoryEvent.objects.filter(provider_event_id=provider_event_id).exists():
            logger.info(f"Order line item {provider_event_id} already processed. Skipping.")
            continue
            
        sku = item.get('sku')
        quantity = item.get('quantity', 1)
        
        try:
            with transaction.atomic():
                # We need to find the matching lot. Since we link lots to listings, 
                # we can find the lot via ChannelListing or by SKU directly if SKUs match.
                # Assuming the external SKU matches the lot SKU or we find it via the listing:
                listing = ChannelListing.objects.filter(
                    integration_id=integration_id,
                    external_sku=sku
                ).select_related('lot').first()
                
                if not listing:
                    # Fallback to direct lot SKU search within the same shop
                    integration = ChannelIntegration.objects.get(id=integration_id)
                    lot = InventoryLot.objects.select_for_update().filter(shop=integration.shop, sku=sku).first()
                else:
                    lot = InventoryLot.objects.select_for_update().get(id=listing.lot_id)
                
                if not lot:
                    logger.error(f"Could not find lot for SKU {sku} in order {order_id}")
                    continue

                if lot.quantity_available < quantity:
                    logger.warning(f"Oversell detected for {sku}: trying to sell {quantity}, have {lot.quantity_available}")
                    # In a real app we might still process the sale to reflect reality and leave negative quantity,
                    # but for MVP constraint requires >=0. We will decrement up to 0 or we might fail.
                    # Since our constraint requires quantity_available >= 0, we can only sell what we have.
                    actual_decrement = lot.quantity_available
                else:
                    actual_decrement = quantity
                
                lot.quantity_available -= actual_decrement
                lot.save(update_fields=['quantity_available', 'updated_at'])
                
                InventoryEvent.objects.create(
                    lot=lot,
                    event_type='sale',
                    quantity_delta=-actual_decrement,
                    resulting_quantity=lot.quantity_available,
                    provider_event_id=provider_event_id,
                    order_id=order_id,
                    metadata={'ebay_line_item': item}
                )
                
                # Queue tasks to update all listings tied to this lot (including the one just sold, 
                # since eBay might not auto-sync out-of-stock across other identical listings if any)
                related_listings = ChannelListing.objects.filter(lot=lot)
                for rel_listing in related_listings:
                    push_quantity_to_ebay.delay(rel_listing.id)
                    
        except Exception as e:
            logger.error(f"Error processing line item {line_item_id} for order {order_id}: {e}")

@shared_task(bind=True, max_retries=5)
def push_quantity_to_ebay(self, listing_id):
    """
    Pushes the current quantity_available of a lot to the eBay listing.
    """
    try:
        listing = ChannelListing.objects.select_related('integration', 'lot').get(id=listing_id)
        
        if listing.integration.provider != 'ebay':
            return
            
        client = EbayClient(listing.integration)
        
        # We need to send the lot's current available quantity
        new_quantity = listing.lot.quantity_available
        
        # For our MVP mock client, it updates via SKU (assuming external_sku matches)
        response = client.revise_inventory_status(
            listing_id=listing.external_listing_id, 
            sku=listing.external_sku, 
            quantity=new_quantity
        )
        
        # Update listing state
        listing.listed_quantity = new_quantity
        listing.sync_state = 'synced'
        listing.last_synced_at = timezone.now()
        listing.save()
        
        # Log success SyncJob
        SyncJob.objects.create(
            integration=listing.integration,
            operation='push_quantity',
            direction='outbound',
            status='success',
            request_payload={'sku': listing.external_sku, 'quantity': new_quantity},
            response_payload=response or {},
            completed_at=timezone.now()
        )
        
    except Exception as e:
        logger.error(f"Failed to push quantity for listing {listing_id}: {e}")
        # Log failed SyncJob
        SyncJob.objects.create(
            integration=listing.integration if 'listing' in locals() else None,
            operation='push_quantity',
            direction='outbound',
            status='failed',
            error_message=str(e),
            completed_at=timezone.now()
        )
        
        # Update listing state
        if 'listing' in locals():
            listing.sync_state = 'error'
            listing.save(update_fields=['sync_state'])
            
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
