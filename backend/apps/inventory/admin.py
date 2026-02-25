from django.contrib import admin
from .models import Card, InventoryLot, InventoryEvent

@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ('name', 'set_name', 'card_number', 'variant', 'language', 'shop')
    list_filter = ('set_name', 'language', 'shop')
    search_fields = ('name', 'set_name', 'card_number')

@admin.register(InventoryLot)
class InventoryLotAdmin(admin.ModelAdmin):
    list_display = ('sku', 'card', 'quantity_available', 'condition', 'status', 'shop')
    list_filter = ('status', 'condition', 'shop')
    search_fields = ('sku', 'card__name')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(InventoryEvent)
class InventoryEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'lot', 'quantity_delta', 'resulting_quantity', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('lot__sku', 'order_id')
    readonly_fields = ('created_at',)
