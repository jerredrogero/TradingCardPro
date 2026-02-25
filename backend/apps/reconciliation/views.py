from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Mismatch
from .serializers import MismatchSerializer
from apps.channels.tasks import push_quantity_to_ebay

class MismatchViewSet(viewsets.ModelViewSet):
    serializer_class = MismatchSerializer
    
    def get_queryset(self):
        user = self.request.user
        shop = getattr(user, 'active_shop', None)
        if not shop:
            from apps.accounts.models import Membership
            first_membership = Membership.objects.filter(user=user).first()
            if first_membership:
                shop = first_membership.shop
        
        if not shop:
            return Mismatch.objects.none()
            
        queryset = Mismatch.objects.filter(integration__shop=shop)
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        integration_id = self.request.query_params.get('integration')
        if integration_id:
            queryset = queryset.filter(integration_id=integration_id)
            
        return queryset

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        mismatch = self.get_object()
        resolution = request.data.get('resolution')
        
        if resolution not in ['push_internal', 'pull_channel', 'ignore']:
            return Response(
                {"error": "Invalid resolution type. Must be push_internal, pull_channel, or ignore."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if resolution == 'push_internal':
            if not mismatch.listing:
                return Response(
                    {"error": "Cannot push internal without a linked listing."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create a sync job or queue the task
            push_quantity_to_ebay.delay(mismatch.listing.id)
            
            mismatch.status = 'push_internal'
            mismatch.notes = "Queued push to channel."
            
        elif resolution == 'pull_channel':
            if not mismatch.lot:
                return Response(
                    {"error": "Cannot pull channel quantity without an internal lot."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            from apps.inventory.models import InventoryEvent
            from django.db import transaction
            
            # Need to figure out the delta
            if mismatch.internal_quantity is not None and mismatch.channel_quantity is not None:
                delta = mismatch.channel_quantity - mismatch.internal_quantity
                
                with transaction.atomic():
                    lot = mismatch.lot
                    lot.quantity_available = mismatch.channel_quantity
                    lot.save()
                    
                    InventoryEvent.objects.create(
                        lot=lot,
                        event_type='adjustment',
                        quantity_delta=delta,
                        resulting_quantity=mismatch.channel_quantity,
                        actor=request.user,
                        metadata={'reason': 'reconciliation_pull', 'mismatch_id': mismatch.id}
                    )
                    
            mismatch.status = 'pull_channel'
            mismatch.notes = "Updated internal quantity from channel."
            
        elif resolution == 'ignore':
            mismatch.status = 'ignore'
            mismatch.notes = request.data.get('notes', 'Ignored by user.')
            
        mismatch.resolved_at = timezone.now()
        mismatch.save()
        
        return Response(self.get_serializer(mismatch).data)
