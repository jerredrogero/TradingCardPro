from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChannelIntegrationViewSet, ChannelListingViewSet, SyncJobViewSet, EbayOAuthCallbackView

router = DefaultRouter()
router.register(r'integrations', ChannelIntegrationViewSet, basename='integration')
router.register(r'listings', ChannelListingViewSet, basename='listing')
router.register(r'sync-jobs', SyncJobViewSet, basename='syncjob')

urlpatterns = [
    path('oauth/ebay/callback/', EbayOAuthCallbackView.as_view(), name='ebay_oauth_callback'),
    path('', include(router.urls)),
]
