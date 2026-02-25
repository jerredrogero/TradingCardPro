from rest_framework import status, views, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Shop, Membership, Role
from .serializers import (
    UserSerializer, 
    RegisterSerializer, 
    CustomTokenObtainPairSerializer,
    ShopSerializer
)

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate tokens for the new user
            refresh = RefreshToken.for_user(user)
            
            # Get the user data to return
            user_data = UserSerializer(user).data
            
            return Response({
                'user': user_data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MeView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
        
    def patch(self, request):
        # Support changing active_shop
        if 'active_shop' in request.data:
            shop_id = request.data['active_shop']
            # Verify user has membership to this shop
            if Membership.objects.filter(user=request.user, shop_id=shop_id).exists():
                request.user.active_shop_id = shop_id
                request.user.save()
            else:
                return Response({"error": "Not a member of this shop"}, status=status.HTTP_403_FORBIDDEN)
                
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class ShopViewSet(viewsets.ModelViewSet):
    serializer_class = ShopSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Return only shops the user is a member of
        user_shop_ids = Membership.objects.filter(user=self.request.user).values_list('shop_id', flat=True)
        return Shop.objects.filter(id__in=user_shop_ids)
