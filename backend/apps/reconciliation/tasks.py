import logging
from celery import shared_task
from apps.channels.models import ChannelIntegration, ChannelListing
from apps.reconciliation.models import Mismatch
from integrations.ebay.client import EbayClient
from integrations.ebay.auth import get_valid_access_token

logger = logging.getLogger(__name__)

@shared_task
def reconcile_ebay_listings(integration_id):
    """
    Fetches active eBay listings, compares quantity to internal, and flags mismatches.
    """
    try:
        integration = ChannelIntegration.objects.get(id=integration_id, status='active')
    except ChannelIntegration.DoesNotExist:
        return {"status": "error", "message": "Integration not found or not active"}

    try:
        token = get_valid_access_token(integration)
        client = EbayClient(integration)
        
        # Get active inventory from eBay
        # Assuming get_inventory_items() returns a list of items with SKU and quantity
        # (Using a mock implementation based on EbayClient class in client.py)
        ebay_items = client._request('GET', '/sell/inventory/v1/inventory_item')
        if ebay_items and 'inventoryItems' in ebay_items:
            ebay_items = ebay_items['inventoryItems']
        else:
            ebay_items = []
            
        mismatches_found = 0
        
        for item in ebay_items:
            sku = item.get('sku')
            
            # The structure of availability depends on the eBay API response
            ebay_qty = 0
            if 'availability' in item and 'shipToLocationAvailability' in item['availability']:
                ebay_qty = item['availability']['shipToLocationAvailability'].get('quantity', 0)
                
            ebay_id = item.get('listingId', '') # Might not be present in Inventory Item directly
            
            # We don't have title in inventory_item necessarily, but keeping for logic
            ebay_title = item.get('product', {}).get('title', '')
            
            # Find listing by sku
            listing = ChannelListing.objects.filter(integration=integration, external_sku=sku).first()
            lot = None
            internal_qty = 0
            
            if listing:
                lot = listing.lot
                internal_qty = lot.quantity_available
            else:
                # Try to find lot by sku directly if listing isn't linked
                from apps.inventory.models import InventoryLot
                lot = InventoryLot.objects.filter(shop=integration.shop, sku=sku).first()
                if lot:
                    internal_qty = lot.quantity_available
            
            if ebay_qty != internal_qty:
                # Create or update mismatch
                Mismatch.objects.update_or_create(
                    integration=integration,
                    listing=listing,
                    lot=lot,
                    external_listing_id=ebay_id,
                    defaults={
                        'internal_quantity': internal_qty,
                        'channel_quantity': ebay_qty,
                        'external_sku': sku,
                        'external_title': ebay_title,
                        'status': 'pending',
                        'resolved_at': None
                    }
                )
                mismatches_found += 1
                
        return {"status": "success", "mismatches_found": mismatches_found}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@shared_task
def reconcile_all_integrations():
    """
    Periodic task to trigger reconciliation for all active integrations.
    Runs every hour.
    """
    active_integrations = ChannelIntegration.objects.filter(status='active')
    for integration in active_integrations:
        if integration.provider == 'ebay':
            reconcile_ebay_listings.delay(integration.id)
            logger.info(f"Queued reconciliation for integration {integration.id}")
