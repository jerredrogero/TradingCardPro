import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from apps.channels.models import ChannelIntegration
import hashlib
import hmac
import base64
import os

# https://developer.ebay.com/api-docs/commerce/notification/overview.html

def verify_ebay_signature(request, endpoint_url):
    """
    Verifies the incoming webhook request from eBay
    Uses X-EBAY-SIGNATURE header and the configured verification token
    """
    signature = request.headers.get('X-EBAY-SIGNATURE')
    if not signature:
        return False
        
    verification_token = os.environ.get('EBAY_WEBHOOK_TOKEN')
    if not verification_token:
        return False
        
    # eBay's signature is a base64 encoded HMAC-SHA256 hash of the payload using the token as key
    payload = request.body
    
    # Calculate expected signature
    mac = hmac.new(verification_token.encode(), msg=payload, digestmod=hashlib.sha256)
    expected_signature = base64.b64encode(mac.digest()).decode()
    
    return hmac.compare_digest(expected_signature, signature)

@csrf_exempt
def ebay_notification_webhook(request):
    """
    Webhook handler for eBay Account Deletion and other notifications
    """
    if request.method == 'GET':
        challenge_code = request.GET.get('challenge_code')
        if challenge_code:
            verification_token = os.environ.get('EBAY_WEBHOOK_TOKEN', '')
            endpoint = os.environ.get('EBAY_WEBHOOK_URL', '')
            
            # The challenge response needs to be SHA256 of:
            # challenge_code + verification_token + endpoint
            message = challenge_code + verification_token + endpoint
            challenge_response = hashlib.sha256(message.encode()).hexdigest()
            
            return JsonResponse({'challengeResponse': challenge_response})
            
        return JsonResponse({'status': 'ok'})

    if request.method == 'POST':
        # Verify signature
        endpoint_url = os.environ.get('EBAY_WEBHOOK_URL', request.build_absolute_uri())
        if not verify_ebay_signature(request, endpoint_url):
            return JsonResponse({'error': 'Invalid signature'}, status=403)
            
        try:
            payload = json.loads(request.body)
            # Route based on notification type
            notification_type = payload.get('metadata', {}).get('topic')
            
            if notification_type == 'MARKETPLACE_ACCOUNT_DELETION':
                # Handle account deletion (required by eBay)
                # Find associated integration and mark as disconnected
                pass
                
            return JsonResponse({'status': 'success'}, status=200)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
            
    return JsonResponse({'error': 'Method not allowed'}, status=405)
