import os
import urllib.parse
from django.conf import settings
from django.urls import reverse
from datetime import datetime, timedelta
import requests
import base64
import json
from apps.channels.models import ChannelIntegration
from django.utils import timezone

EBAY_ENV = os.environ.get('EBAY_ENV', 'sandbox')  # 'sandbox' or 'production'

if EBAY_ENV == 'sandbox':
    EBAY_OAUTH_URL = 'https://auth.sandbox.ebay.com/oauth2/authorize'
    EBAY_TOKEN_URL = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
else:
    EBAY_OAUTH_URL = 'https://auth.ebay.com/oauth2/authorize'
    EBAY_TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token'

def get_ebay_credentials():
    app_id = os.environ.get(f'EBAY_{EBAY_ENV.upper()}_APP_ID')
    cert_id = os.environ.get(f'EBAY_{EBAY_ENV.upper()}_CERT_ID')
    ru_name = os.environ.get(f'EBAY_{EBAY_ENV.upper()}_RU_NAME')
    return app_id, cert_id, ru_name

def get_authorization_url(integration_id):
    """Generates the eBay OAuth URL for a user to authorize the app"""
    app_id, _, ru_name = get_ebay_credentials()
    
    # Required scopes for inventory and fulfillment
    scopes = [
        'https://api.ebay.com/oauth/api_scope',
        'https://api.ebay.com/oauth/api_scope/sell.inventory',
        'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
        'https://api.ebay.com/oauth/api_scope/sell.finances',
    ]
    
    params = {
        'client_id': app_id,
        'response_type': 'code',
        'redirect_uri': ru_name,
        'scope': ' '.join(scopes),
        'state': str(integration_id)  # Pass integration_id in state to know which shop it's for
    }
    
    query_string = urllib.parse.urlencode(params)
    return f"{EBAY_OAUTH_URL}?{query_string}"

def exchange_code_for_token(code):
    """Exchanges an authorization code for an access token and refresh token"""
    app_id, cert_id, ru_name = get_ebay_credentials()
    
    auth_str = f"{app_id}:{cert_id}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': f'Basic {b64_auth}'
    }
    
    data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': ru_name
    }
    
    response = requests.post(EBAY_TOKEN_URL, headers=headers, data=data)
    response.raise_for_status()
    return response.json()

def refresh_access_token(integration):
    """Refreshes an expired access token using the refresh token"""
    if not integration.credentials:
        raise ValueError("No credentials found for integration")
        
    creds = json.loads(integration.credentials)
    refresh_token = creds.get('refresh_token')
    
    if not refresh_token:
        raise ValueError("No refresh token available")
        
    app_id, cert_id, _ = get_ebay_credentials()
    
    auth_str = f"{app_id}:{cert_id}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': f'Basic {b64_auth}'
    }
    
    scopes = [
        'https://api.ebay.com/oauth/api_scope',
        'https://api.ebay.com/oauth/api_scope/sell.inventory',
        'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
        'https://api.ebay.com/oauth/api_scope/sell.finances',
    ]
    
    data = {
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
        'scope': ' '.join(scopes)
    }
    
    response = requests.post(EBAY_TOKEN_URL, headers=headers, data=data)
    response.raise_for_status()
    
    token_data = response.json()
    
    # Update the stored credentials
    creds['access_token'] = token_data['access_token']
    if 'refresh_token' in token_data:
        creds['refresh_token'] = token_data['refresh_token']
        
    integration.credentials = json.dumps(creds)
    integration.token_expiry = timezone.now() + timedelta(seconds=token_data['expires_in'])
    integration.save()
    
    return token_data['access_token']

def get_valid_access_token(integration):
    """Returns a valid access token, refreshing if necessary"""
    if integration.status != 'active' or not integration.credentials:
        raise ValueError("Integration is not active or missing credentials")
        
    # Add a 5 minute buffer before expiry
    if integration.token_expiry and integration.token_expiry < timezone.now() + timedelta(minutes=5):
        return refresh_access_token(integration)
        
    creds = json.loads(integration.credentials)
    return creds.get('access_token')
