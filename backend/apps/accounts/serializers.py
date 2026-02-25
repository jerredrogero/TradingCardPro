from rest_framework import serializers
from .models import Shop, User, Role, Membership
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ['id', 'name', 'slug', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name']

class UserSerializer(serializers.ModelSerializer):
    active_shop = ShopSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'active_shop']
        read_only_fields = ['id']

class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    shop_name = serializers.CharField(max_length=255)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def create(self, validated_data):
        # Create user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        # Create shop
        shop = Shop.objects.create(name=validated_data['shop_name'])
        
        # Create owner role if it doesn't exist
        owner_role, _ = Role.objects.get_or_create(name='owner')
        
        # Create membership
        Membership.objects.create(
            user=user,
            shop=shop,
            role=owner_role
        )
        
        # Set active shop
        user.active_shop = shop
        user.save()
        
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add custom claims
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'active_shop': ShopSerializer(self.user.active_shop).data if self.user.active_shop else None
        }
        
        if self.user.active_shop:
            data['active_shop'] = {
                'id': self.user.active_shop.id,
                'name': self.user.active_shop.name,
                'slug': self.user.active_shop.slug,
            }
        
        return data
