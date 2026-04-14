from celery import shared_task

from dulux_chatbot.chatbot.services.sessions import reset_whatsapp_session_to_main_menu
from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppClient


@shared_task
def send_whatsapp_main_menu(phone_number: str, message: str) -> None:
    reset_whatsapp_session_to_main_menu(phone_number=phone_number)
    WhatsAppClient().send_text(phone_number, message)
