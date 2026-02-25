from django.db import models
from django.db.models import JSONField
from encrypted_model_fields.fields import EncryptedCharField

class ChannelIntegration(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('disconnected', 'Disconnected'),
    )

    shop = models.ForeignKey('accounts.Shop', on_delete=models.CASCADE, related_name='integrations')
    provider = models.CharField(max_length=50, choices=[('ebay', 'eBay')], default='ebay')
    credentials = EncryptedCharField(max_length=2000, blank=True, null=True)
    scopes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='disconnected')
    token_expiry = models.DateTimeField(null=True, blank=True)
    last_poll_cursor = models.CharField(max_length=255, blank=True, null=True)
    metadata = JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_provider_display()} - {self.shop.name} ({self.status})"

class ChannelListing(models.Model):
    SYNC_STATE_CHOICES = (
        ('synced', 'Synced'),
        ('pending', 'Pending'),
        ('error', 'Error'),
        ('delisted', 'Delisted'),
    )

    integration = models.ForeignKey(ChannelIntegration, on_delete=models.CASCADE, related_name='listings')
    lot = models.ForeignKey('inventory.InventoryLot', on_delete=models.CASCADE, related_name='channel_listings')
    external_listing_id = models.CharField(max_length=255)
    external_sku = models.CharField(max_length=255, blank=True, null=True)
    listed_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    listed_quantity = models.IntegerField(default=0)
    sync_state = models.CharField(max_length=20, choices=SYNC_STATE_CHOICES, default='pending')
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('integration', 'external_listing_id')

    def __str__(self):
        return f"{self.integration.provider} Listing {self.external_listing_id} for {self.lot.sku}"

class SyncJob(models.Model):
    DIRECTION_CHOICES = (
        ('inbound', 'Inbound'),
        ('outbound', 'Outbound'),
    )
    STATUS_CHOICES = (
        ('queued', 'Queued'),
        ('running', 'Running'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('dead', 'Dead'),
    )

    integration = models.ForeignKey(ChannelIntegration, on_delete=models.CASCADE, related_name='sync_jobs')
    operation = models.CharField(max_length=100)
    direction = models.CharField(max_length=20, choices=DIRECTION_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    request_payload = JSONField(default=dict, blank=True, null=True)
    response_payload = JSONField(default=dict, blank=True, null=True)
    retries = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.operation} ({self.status}) for {self.integration.shop.name}"
