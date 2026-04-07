from django.urls import path

from dulux_chatbot.chatbot.api.v1.views import WhatsAppWebhookView


urlpatterns = [
    path("webhook/", WhatsAppWebhookView.as_view(), name="whatsapp_webhook"),
]
