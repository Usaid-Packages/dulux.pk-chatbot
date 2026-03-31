from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin


User = get_user_model()


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = (
        "id",
        "email",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "is_staff",
        "is_superuser",
    )
    list_filter = (
        "role",
        "is_active",
        "is_staff",
        "is_superuser",
        "date_joined",
        "last_login",
    )
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "role",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        ("Name", {"fields": ["first_name", "last_name"]}),
    )
    ordering = ("email",)
    search_fields = (
        "=id",
        "email",
        "first_name",
        "last_name",
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "first_name",
                    "last_name",
                    "email",
                    "password1",
                    "password2",
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )
