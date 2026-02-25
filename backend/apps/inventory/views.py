import uuid
from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from django.core.cache import cache
from django_filters.rest_framework import DjangoFilterBackend
from .models import Card, InventoryLot, InventoryEvent
from .serializers import CardSerializer, InventoryLotSerializer, InventoryEventSerializer
from .tasks import parse_and_import_csv

class DashboardSummaryView(views.APIView):
    def get(self, request, *args, **kwargs):
        shop_id = getattr(request, 'active_shop_id', None)
        if not shop_id:
            # Check if user has any shops at all
            from apps.accounts.models import Membership
            first_membership = Membership.objects.filter(user=request.user).first()
            if first_membership:
                shop_id = first_membership.shop_id
                # Update user's active shop for future requests
                request.user.active_shop_id = shop_id
                request.user.save()
            else:
                return Response({
                    'total_inventory_value': 0,
                    'total_cards': 0,
                    'total_lots': 0,
                    'recent_sales_30d': 0,
                    'sync_errors': 0,
                    'recent_activity': [],
                    'no_shop': True
                })
            
        # Get total lots and cards
        total_lots = InventoryLot.objects.filter(shop_id=shop_id).count()
        total_cards = Card.objects.filter(shop_id=shop_id).count()
        
        # Calculate total inventory value based on cost basis
        from django.db.models import Sum, F
        value_agg = InventoryLot.objects.filter(shop_id=shop_id).aggregate(
            total_value=Sum(F('quantity_available') * F('cost_basis'))
        )
        total_value = value_agg['total_value'] or 0
        
        # Recent sales (30d)
        from django.utils import timezone
        import datetime
        thirty_days_ago = timezone.now() - datetime.timedelta(days=30)
        recent_sales = InventoryEvent.objects.filter(
            lot__shop_id=shop_id,
            event_type='sale',
            created_at__gte=thirty_days_ago
        ).count()
        
        # Sync errors
        from apps.channels.models import ChannelListing
        sync_errors = ChannelListing.objects.filter(
            integration__shop_id=shop_id,
            sync_state='error'
        ).count()
        
        # Recent activity
        recent_activity = InventoryEvent.objects.filter(
            lot__shop_id=shop_id
        ).order_by('-created_at')[:5]
        
        activity_data = InventoryEventSerializer(recent_activity, many=True).data
        
        return Response({
            'total_inventory_value': total_value,
            'total_cards': total_cards,
            'total_lots': total_lots,
            'recent_sales_30d': recent_sales,
            'sync_errors': sync_errors,
            'recent_activity': activity_data
        })

class CSVImportView(views.APIView):
    """
    API endpoint for handling CSV file uploads.
    """
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        mapping_data = request.data.get('mapping')
        
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not mapping_data:
            return Response({'error': 'Column mapping is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not file_obj.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
            
        shop_id = getattr(request, 'active_shop_id', None)
        if not shop_id:
            return Response({'error': 'Shop context required'}, status=status.HTTP_400_BAD_REQUEST)
            
        task_id = str(uuid.uuid4())
        
        # Read file content to pass to Celery task
        file_content = file_obj.read()
        
        # Dispatch Celery task
        parse_and_import_csv.delay(
            task_id=task_id,
            shop_id=shop_id,
            user_id=request.user.id,
            file_content=file_content,
            column_mapping=mapping_data
        )
        
        return Response({'task_id': task_id}, status=status.HTTP_202_ACCEPTED)

class CSVImportStatusView(views.APIView):
    """
    Endpoint for polling the status of a CSV import task.
    """
    def get(self, request, task_id, *args, **kwargs):
        cache_key = f"csv_import_{task_id}"
        result = cache.get(cache_key)
        
        if result:
            return Response(result)
            
        # Note: We aren't checking Celery's actual AsyncResult here for simplicity
        # and because we cached the result. In a production app with long tasks,
        # we might want to check the actual task status.
        return Response({'status': 'pending'})

class BaseShopViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet that automatically filters by active shop.
    Assumes ShopScopingMiddleware is setting request.active_shop_id
    """
    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return super().get_queryset().none()

        shop_id = getattr(self.request, 'active_shop_id', None)
        if not shop_id:
            from apps.accounts.models import Membership
            first_membership = Membership.objects.filter(user=user).first()
            if first_membership:
                shop_id = first_membership.shop_id
        
        if shop_id:
            return super().get_queryset().filter(shop_id=shop_id)
        return super().get_queryset().none()

    def perform_create(self, serializer):
        shop_id = getattr(self.request, 'active_shop_id', None)
        if not shop_id:
            # Fallback to user's first shop if middleware hasn't set it
            from apps.accounts.models import Membership
            first_membership = Membership.objects.filter(user=self.request.user).first()
            if first_membership:
                shop_id = first_membership.shop_id
        
        serializer.save(shop_id=shop_id)

class CardViewSet(BaseShopViewSet):
    queryset = Card.objects.all()
    serializer_class = CardSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['name', 'set_name', 'card_number']

class InventoryLotViewSet(BaseShopViewSet):
    queryset = InventoryLot.objects.all()
    serializer_class = InventoryLotSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'condition', 'location']

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def adjust(self, request, pk=None):
        lot = self.get_object()
        quantity_delta = request.data.get('quantity_delta')
        
        if quantity_delta is None:
            return Response({"error": "quantity_delta is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            quantity_delta = int(quantity_delta)
        except ValueError:
            return Response({"error": "quantity_delta must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        new_quantity = lot.quantity_available + quantity_delta
        
        if new_quantity < 0:
            return Response({"error": "Resulting quantity cannot be negative"}, status=status.HTTP_400_BAD_REQUEST)

        lot.quantity_available = new_quantity
        lot.save()

        # Create audit ledger event
        InventoryEvent.objects.create(
            lot=lot,
            event_type='adjustment',
            quantity_delta=quantity_delta,
            resulting_quantity=new_quantity,
            actor=request.user,
            metadata={"reason": request.data.get('reason', '')}
        )

        return Response(self.get_serializer(lot).data)

    @action(detail=True, methods=['post'], url_path='grading/send')
    @transaction.atomic
    def grading_send(self, request, pk=None):
        lot = self.get_object()
        quantity = request.data.get('quantity', lot.quantity_available)
        
        try:
            quantity = int(quantity)
        except ValueError:
            return Response({"error": "quantity must be an integer"}, status=status.HTTP_400_BAD_REQUEST)
            
        if quantity <= 0 or quantity > lot.quantity_available:
             return Response({"error": "Invalid quantity to send for grading"}, status=status.HTTP_400_BAD_REQUEST)

        lot.quantity_available -= quantity
        lot.status = 'grading'
        lot.save()
        
        InventoryEvent.objects.create(
            lot=lot,
            event_type='grading_out',
            quantity_delta=-quantity,
            resulting_quantity=lot.quantity_available,
            actor=request.user,
        )
        
        return Response(self.get_serializer(lot).data)

    @action(detail=True, methods=['post'], url_path='grading/return')
    @transaction.atomic
    def grading_return(self, request, pk=None):
        lot = self.get_object()
        quantity = request.data.get('quantity')
        
        if lot.status != 'grading':
             return Response({"error": "Lot is not in grading status"}, status=status.HTTP_400_BAD_REQUEST)
             
        try:
            quantity = int(quantity) if quantity else 1 # default to 1
        except ValueError:
            return Response({"error": "quantity must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        lot.quantity_available += quantity
        lot.status = 'available'
        lot.save()
        
        InventoryEvent.objects.create(
            lot=lot,
            event_type='grading_in',
            quantity_delta=quantity,
            resulting_quantity=lot.quantity_available,
            actor=request.user,
            metadata={"grade": request.data.get('grade', '')}
        )
        
        return Response(self.get_serializer(lot).data)

class InventoryEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryEvent.objects.all().order_by('-created_at')
    serializer_class = InventoryEventSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['lot', 'event_type']
    
    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return super().get_queryset().none()

        shop_id = getattr(self.request, 'active_shop_id', None)
        if not shop_id:
            from apps.accounts.models import Membership
            first_membership = Membership.objects.filter(user=user).first()
            if first_membership:
                shop_id = first_membership.shop_id

        if shop_id:
            # Events are linked to lots, which are linked to shops
            return super().get_queryset().filter(lot__shop_id=shop_id)
        return super().get_queryset().none()
