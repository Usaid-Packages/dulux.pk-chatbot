import logging

from celery import shared_task

from dulux_chatbot.chatbot.models import WhatsAppSession
from dulux_chatbot.chatbot.services.sessions import reset_whatsapp_session_to_main_menu
from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppClient
from dulux_chatbot.chatbot.utils.helpers import format_product_message
from dulux_chatbot.products.models import Product


logger = logging.getLogger("dulux_chatbot")


@shared_task
def send_whatsapp_main_menu(phone_number: str, message: str) -> None:
    reset_whatsapp_session_to_main_menu(phone_number=phone_number)
    WhatsAppClient().send_text(phone_number, message)


@shared_task
def dispatch_whatsapp_message(session_id: int, message: dict) -> None:
    from dulux_chatbot.chatbot.handlers.dispatcher import dispatch

    session = WhatsAppSession.objects.filter(pk=session_id).first()
    if session is None:
        logger.warning("WhatsApp dispatch skipped because session %s does not exist.", session_id)
        return

    client = WhatsAppClient()
    try:
        dispatch(session=session, message=message, client=client)
    except Exception as e:
        logger.exception("WhatsApp webhook dispatch failed: %s", e)
        try:
            client.send_text(session.phone_number, "Something went wrong. Please try again later.")
        except Exception as fallback_error:
            logger.exception("WhatsApp webhook fallback message failed: %s", fallback_error)


@shared_task
def send_find_product_results(phone_number: str, product_ids: list[int], main_menu_message: str) -> None:
    client = WhatsAppClient()
    products = (
        Product.objects.filter(id__in=product_ids, is_active=True).prefetch_related("images__image").order_by("name")
    )
    for product in products:
        product_message = format_product_message(product=product)
        product_image = next(iter(product.images.all()), None)
        if product_image is not None:
            client.send_image(phone_number, product_image.image.image.url, product_message)
        else:
            client.send_text(phone_number, product_message)
    send_whatsapp_main_menu.apply_async(args=[phone_number, main_menu_message], countdown=2)
