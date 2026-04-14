from celery import shared_task

from dulux_chatbot.chatbot.flows.base import BaseFlow
from dulux_chatbot.chatbot.services.sessions import reset_whatsapp_session_to_main_menu
from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppClient
from dulux_chatbot.chatbot.tasks import send_whatsapp_main_menu


@shared_task
def send_complaint_closed_notification(phone_number: str, subject: str) -> None:
    reset_whatsapp_session_to_main_menu(phone_number=phone_number)
    WhatsAppClient().send_text(phone_number, f"Your complaint with subject: {subject} has been closed.")
    send_whatsapp_main_menu.apply_async(args=[phone_number, BaseFlow.MAIN_MENU_TEXT], countdown=2)
