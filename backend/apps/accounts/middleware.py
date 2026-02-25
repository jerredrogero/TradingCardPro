import threading

def _get_current_request():
    """Get the current request from thread local storage."""
    return getattr(_thread_locals, 'request', None)

_thread_locals = threading.local()

class ShopScopingMiddleware:
    """
    Middleware that sets the current active shop ID in thread local storage.
    This allows models and managers to automatically filter queries by the active shop.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        
        # Determine the active shop
        if hasattr(request, 'user') and request.user.is_authenticated:
            # First check headers for an explicit shop override (useful for admins/multi-shop owners)
            shop_id_header = request.headers.get('X-Shop-ID')
            if shop_id_header and shop_id_header.isdigit():
                # Verify user has access to this shop
                from .models import Membership
                if Membership.objects.filter(user=request.user, shop_id=shop_id_header).exists():
                    request.active_shop_id = int(shop_id_header)
                else:
                    request.active_shop_id = getattr(request.user.active_shop, 'id', None)
            else:
                # Default to the user's selected active shop
                request.active_shop_id = getattr(request.user.active_shop, 'id', None)
        else:
            request.active_shop_id = None
            
        response = self.get_response(request)
        
        # Cleanup
        if hasattr(_thread_locals, 'request'):
            del _thread_locals.request
            
        return response
