from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CardViewSet, InventoryLotViewSet, InventoryEventViewSet, CSVImportView, CSVImportStatusView, DashboardSummaryView

router = DefaultRouter()
router.register(r'cards', CardViewSet)
router.register(r'lots', InventoryLotViewSet)
router.register(r'events', InventoryEventViewSet)

urlpatterns = [
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('import/csv/', CSVImportView.as_view(), name='csv-import'),
    path('import/csv/status/<str:task_id>/', CSVImportStatusView.as_view(), name='csv-import-status'),
    path('', include(router.urls)),
]
