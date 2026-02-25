from django.contrib import admin
from .models import Mismatch

@admin.register(Mismatch)
class MismatchAdmin(admin.ModelAdmin):
    list_display = ('external_sku', 'internal_quantity', 'channel_quantity', 'status', 'created_at')
    list_filter = ('status', 'integration__provider')
    search_fields = ('external_sku', 'external_listing_id', 'external_title')
    readonly_fields = ('created_at', 'resolved_at')
