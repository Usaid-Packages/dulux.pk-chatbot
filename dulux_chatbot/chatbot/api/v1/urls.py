from django.urls import path

from dulux_chatbot.chatbot.api.v1.views import WhatsAppFlowDataExchangeView, WhatsAppWebhookView


urlpatterns = [
    path("webhook/", WhatsAppWebhookView.as_view(), name="whatsapp_webhook"),
    path("flows/data-exchange/", WhatsAppFlowDataExchangeView.as_view(), name="whatsapp_flow_data_exchange"),
]
