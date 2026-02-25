from rest_framework import serializers
from .models import ChannelIntegration, ChannelListing, SyncJob

class ChannelIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChannelIntegration
        fields = ['id', 'provider', 'status', 'token_expiry', 'last_poll_cursor', 'created_at']
        read_only_fields = ['id', 'status', 'token_expiry', 'last_poll_cursor', 'created_at']
        
class ChannelListingSerializer(serializers.ModelSerializer):
    lot_sku = serializers.CharField(source='lot.sku', read_only=True)
    lot_name = serializers.CharField(source='lot.card.name', read_only=True)
    
    class Meta:
        model = ChannelListing
        fields = [
            'id', 'integration', 'lot', 'lot_sku', 'lot_name', 
            'external_listing_id', 'external_sku', 'listed_price', 
            'listed_quantity', 'sync_state', 'last_synced_at', 'created_at'
        ]
        read_only_fields = ['id', 'sync_state', 'last_synced_at', 'created_at']

class SyncJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncJob
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'completed_at']
