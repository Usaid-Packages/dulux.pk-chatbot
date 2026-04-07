from django.contrib import admin

from dulux_chatbot.chatbot.models import ProcessedMessage, WhatsAppSession


@admin.register(WhatsAppSession)
class WhatsAppSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "phone_number", "flow", "current_step", "last_activity")
    list_filter = ("flow",)
    search_fields = ("phone_number",)


@admin.register(ProcessedMessage)
class ProcessedMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "message_id", "processed_at")
    search_fields = ("message_id",)
