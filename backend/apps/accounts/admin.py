from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Shop, Role, Membership

class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'active_shop', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        ('Shop Info', {'fields': ('active_shop',)}),
    )
    inlines = [MembershipInline]

@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'shop', 'role', 'created_at')
    list_filter = ('shop', 'role')
    search_fields = ('user__username', 'shop__name')
