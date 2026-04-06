from django.contrib import admin

from dulux_chatbot.complaints.models import ChatMessage, Complaint, ComplaintImage


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ("id", "customer_name", "phone_number", "subject", "status", "assigned_to", "created")
    list_filter = ("status",)
    search_fields = ("customer_name", "phone_number", "subject")
    raw_id_fields = ("registration", "assigned_to")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "complaint", "sender", "created")
    list_filter = ("sender",)
    raw_id_fields = ("complaint",)


@admin.register(ComplaintImage)
class ComplaintImageAdmin(admin.ModelAdmin):
    list_display = ("id", "complaint", "created")
    raw_id_fields = ("complaint", "image")
