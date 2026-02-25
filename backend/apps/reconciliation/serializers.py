from rest_framework import serializers
from .models import Mismatch
from apps.inventory.serializers import InventoryLotSerializer
from apps.channels.serializers import ChannelListingSerializer

class MismatchSerializer(serializers.ModelSerializer):
    lot_details = InventoryLotSerializer(source='lot', read_only=True)
    listing_details = ChannelListingSerializer(source='listing', read_only=True)
    
    class Meta:
        model = Mismatch
        fields = [
            'id', 'integration', 'listing', 'lot',
            'internal_quantity', 'channel_quantity',
            'external_listing_id', 'external_sku', 'external_title',
            'status', 'notes', 'created_at', 'resolved_at',
            'lot_details', 'listing_details'
        ]
        read_only_fields = ['created_at', 'resolved_at']
