from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    # Add 'designation' to the user list page
    list_display = UserAdmin.list_display + ('designation',)
    
    # Add 'designation' to the user edit page
    fieldsets = UserAdmin.fieldsets + (
        ('Professional Info', {'fields': ('designation',)}),
    )
    
    # Add 'designation' to the "Add User" page (optional)
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('designation',)}),
    )

admin.site.register(User, CustomUserAdmin)
