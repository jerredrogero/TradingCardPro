from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import redirect
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import json
import logging
from .models import ChannelIntegration, ChannelListing, SyncJob
from .serializers import ChannelIntegrationSerializer, ChannelListingSerializer, SyncJobSerializer
from .tasks import push_quantity_to_ebay
from integrations.ebay.auth import get_authorization_url, exchange_code_for_token

logger = logging.getLogger(__name__)

class ChannelIntegrationViewSet(viewsets.ModelViewSet):
    serializer_class = ChannelIntegrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        shop = getattr(user, 'active_shop', None)
        if not shop:
            from apps.accounts.models import Membership
            first_membership = Membership.objects.filter(user=user).first()
            if first_membership:
                shop = first_membership.shop
        
        if shop:
            return ChannelIntegration.objects.filter(shop=shop)
        return ChannelIntegration.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        shop = getattr(user, 'active_shop', None)
        if not shop:
            from apps.accounts.models import Membership
            first_membership = Membership.objects.filter(user=user).first()
            if first_membership:
                shop = first_membership.shop
        
        serializer.save(shop=shop)

    @action(detail=True, methods=['post'])
    def connect(self, request, pk=None):
        """
        Initiates the eBay OAuth flow.
        """
        integration = self.get_object()
        
        if integration.provider == 'ebay':
            auth_url = get_authorization_url(integration.id)
            return Response({'auth_url': auth_url})
            
        return Response({'error': 'Unsupported provider'}, status=status.HTTP_400_BAD_REQUEST)

class EbayOAuthCallbackView(views.APIView):
    permission_classes = [] # Allow anonymous callback

    def get(self, request):
        code = request.query_params.get('code')
        state = request.query_params.get('state') # We passed integration_id in state
        
        if not code or not state:
            return Response({'error': 'Missing code or state'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            integration_id = int(state)
            integration = ChannelIntegration.objects.get(id=integration_id)
            
            token_data = exchange_code_for_token(code)
            
            # Store credentials
            creds = {
                'access_token': token_data.get('access_token'),
                'refresh_token': token_data.get('refresh_token')
            }
            integration.credentials = json.dumps(creds)
            
            # Token expiry
            expires_in = token_data.get('expires_in', 7200)
            integration.token_expiry = timezone.now() + timedelta(seconds=expires_in)
            integration.status = 'active'
            integration.save()
            
            # Redirect back to frontend
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            return redirect(f"{frontend_url}/channels?status=success&integration_id={integration_id}")
            
        except ChannelIntegration.DoesNotExist:
            return Response({'error': 'Invalid state parameter'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error during eBay OAuth callback: {e}")
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            return redirect(f"{frontend_url}/channels?status=error&message=AuthFailed")

class ChannelListingViewSet(viewsets.ModelViewSet):
    serializer_class = ChannelListingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        shop = getattr(user, 'active_shop', None)
        if not shop:
            from apps.accounts.models import Membership
            first_membership = Membership.objects.filter(user=user).first()
            if first_membership:
                shop = first_membership.shop
        
        if shop:
            return ChannelListing.objects.filter(integration__shop=shop)
        return ChannelListing.objects.none()

    @action(detail=False, methods=['post'])
    def link(self, request):
        """
        Link internal lot to external listing.
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            listing = serializer.save()
            # Push initial quantity to channel upon linking
            push_quantity_to_ebay.delay(listing.id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def push(self, request, pk=None):
        """
        Force push internal qty to channel.
        """
        listing = self.get_object()
        push_quantity_to_ebay.delay(listing.id)
        return Response({"status": "Push task queued"})

class SyncJobViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SyncJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        shop = getattr(user, 'active_shop', None)
        if not shop:
            from apps.accounts.models import Membership
            first_membership = Membership.objects.filter(user=user).first()
            if first_membership:
                shop = first_membership.shop
        
        if shop:
            return SyncJob.objects.filter(integration__shop=shop)
        return SyncJob.objects.none()
