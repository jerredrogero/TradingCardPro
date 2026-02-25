from django.contrib import admin
from .models import ChannelIntegration, ChannelListing, SyncJob

@admin.register(ChannelIntegration)
class ChannelIntegrationAdmin(admin.ModelAdmin):
    list_display = ('provider', 'shop', 'status', 'token_expiry', 'created_at')
    list_filter = ('provider', 'status', 'shop')

@admin.register(ChannelListing)
class ChannelListingAdmin(admin.ModelAdmin):
    list_display = ('external_listing_id', 'external_sku', 'integration', 'sync_state', 'last_synced_at')
    list_filter = ('sync_state', 'integration__provider')
    search_fields = ('external_listing_id', 'external_sku')

@admin.register(SyncJob)
class SyncJobAdmin(admin.ModelAdmin):
    list_display = ('operation', 'direction', 'status', 'integration', 'created_at')
    list_filter = ('status', 'direction', 'operation')
    readonly_fields = ('created_at', 'completed_at')
