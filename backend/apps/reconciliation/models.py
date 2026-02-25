from django.db import models
from django.db.models import JSONField

class Mismatch(models.Model):
    RESOLUTION_CHOICES = (
        ('pending', 'Pending'),
        ('push_internal', 'Push Internal to Channel'),
        ('pull_channel', 'Pull Channel to Internal'),
        ('ignore', 'Ignored'),
    )
    
    integration = models.ForeignKey('channels.ChannelIntegration', on_delete=models.CASCADE, related_name='mismatches')
    listing = models.ForeignKey('channels.ChannelListing', on_delete=models.CASCADE, related_name='mismatches', null=True, blank=True)
    lot = models.ForeignKey('inventory.InventoryLot', on_delete=models.CASCADE, related_name='mismatches', null=True, blank=True)
    
    internal_quantity = models.IntegerField(null=True, blank=True)
    channel_quantity = models.IntegerField(null=True, blank=True)
    
    # Store external ID in case listing isn't linked yet or is unmapped
    external_listing_id = models.CharField(max_length=255, blank=True)
    external_sku = models.CharField(max_length=255, blank=True)
    external_title = models.CharField(max_length=255, blank=True)
    
    status = models.CharField(max_length=20, choices=RESOLUTION_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Mismatch for {self.external_listing_id or self.lot}"
