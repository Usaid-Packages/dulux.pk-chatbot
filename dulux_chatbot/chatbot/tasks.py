from celery import shared_task

from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppClient


@shared_task
def send_whatsapp_main_menu(phone_number: str, message: str) -> None:
    WhatsAppClient().send_text(phone_number, message)
