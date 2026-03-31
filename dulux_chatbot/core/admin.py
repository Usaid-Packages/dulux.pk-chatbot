from django.contrib import admin

from dulux_chatbot.core.models import Image


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ("id", "image", "created", "modified")
    search_fields = ("id",)
