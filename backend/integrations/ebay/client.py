import requests
import time
from urllib.parse import urljoin
from .auth import get_valid_access_token

class EbayAuth:
    def __init__(self, integration):
        self.integration = integration
        
    def get_access_token(self):
        return get_valid_access_token(self.integration)

class EbayClient:
    """
    eBay REST API client wrapper.
    Handles authentication, rate limiting (429 retries), and basic requests.
    """
    def __init__(self, integration):
        self.auth = EbayAuth(integration)
        self.env = 'sandbox' # config driven in reality
        self.base_url = 'https://api.sandbox.ebay.com' if self.env == 'sandbox' else 'https://api.ebay.com'
        
    def _request(self, method, endpoint, **kwargs):
        """
        Base request handler with retry logic for rate limits.
        """
        url = urljoin(self.base_url, endpoint)
        max_retries = 3
        
        for attempt in range(max_retries):
            # Always get fresh/valid token
            headers = kwargs.pop('headers', {})
            headers['Authorization'] = f"Bearer {self.auth.get_access_token()}"
            headers['Content-Type'] = 'application/json'
            kwargs['headers'] = headers
            
            response = requests.request(method, url, **kwargs)
            
            if response.status_code == 429: # Too Many Requests
                retry_after = int(response.headers.get('Retry-After', 5))
                time.sleep(retry_after)
                continue
                
            response.raise_for_status()
            return response.json() if response.content else None
            
        raise Exception("Max retries exceeded for eBay API request")

    def get_orders(self, created_time_from=None):
        """
        Polls for new orders from the eBay Fulfillment API.
        """
        endpoint = '/sell/fulfillment/v1/order'
        params = {}
        if created_time_from:
            params['filter'] = f"creationdate:[{created_time_from}..]"
            
        return self._request('GET', endpoint, params=params)

    def revise_inventory_status(self, listing_id, sku, quantity):
        """
        Updates the available quantity for a listing using the Trading API or Inventory API.
        Assuming Inventory API for REST-based approach here.
        Note: This is a simplified representation of the Inventory API call.
        """
        endpoint = f'/sell/inventory/v1/inventory_item/{sku}'
        # Real implementation depends heavily on whether they are using Trading API (XML/JSON)
        # or the new REST Inventory API. The plan says "Trading API for inventory".
        # For MVP we will mock the REST equivalent.
        
        payload = {
            "availability": {
                "shipToLocationAvailability": {
                    "quantity": quantity
                }
            }
        }
        return self._request('PUT', endpoint, json=payload)
