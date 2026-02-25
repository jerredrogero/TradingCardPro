from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.accounts.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/channels/', include('apps.channels.urls')),
    path('api/reconciliation/', include('apps.reconciliation.urls')),
]
