from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MismatchViewSet

router = DefaultRouter()
router.register(r'mismatches', MismatchViewSet, basename='mismatch')

urlpatterns = [
    path('', include(router.urls)),
]
