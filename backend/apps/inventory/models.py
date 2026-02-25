from django.db import models
from django.contrib.auth import get_user_model
from apps.accounts.models import Shop

User = get_user_model()

class Card(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='cards')
    name = models.CharField(max_length=255)
    set_name = models.CharField(max_length=255, blank=True, null=True)
    card_number = models.CharField(max_length=100, blank=True, null=True)
    variant = models.CharField(max_length=100, blank=True, null=True)
    language = models.CharField(max_length=50, default='English')
    attributes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('shop', 'name', 'set_name', 'card_number', 'variant', 'language')

    def __str__(self):
        return f"{self.name} - {self.set_name}"

class InventoryLot(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('reserved', 'Reserved'),
        ('grading', 'Sent for Grading'),
        ('damaged', 'Damaged'),
    ]

    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='inventory_lots')
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='lots')
    sku = models.CharField(max_length=100, unique=True)
    quantity_available = models.PositiveIntegerField(default=0)
    quantity_reserved = models.PositiveIntegerField(default=0)
    condition = models.CharField(max_length=100)
    language = models.CharField(max_length=50, default='English')
    location = models.CharField(max_length=255, blank=True, null=True)
    cost_basis = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    initial_quantity = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.sku} - {self.card.name}"

class InventoryEvent(models.Model):
    EVENT_TYPES = [
        ('sale', 'Sale'),
        ('adjustment', 'Manual Adjustment'),
        ('grading_out', 'Sent for Grading'),
        ('grading_in', 'Returned from Grading'),
        ('reserve', 'Reserved'),
        ('unreserve', 'Unreserved'),
        ('import', 'CSV Import'),
    ]

    lot = models.ForeignKey(InventoryLot, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    quantity_delta = models.IntegerField()
    resulting_quantity = models.PositiveIntegerField()
    provider_event_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    order_id = models.CharField(max_length=255, null=True, blank=True)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_type} on {self.lot.sku} (Delta: {self.quantity_delta})"
