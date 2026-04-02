import logging

from celery import shared_task

from dulux_chatbot.warranty.models import WarrantyRegistration
from dulux_chatbot.warranty.services.certificate import generate_warranty_certificate


logger = logging.getLogger("dulux_chatbot")


@shared_task(
    autoretry_for=(Exception,),
    max_retries=3,
    retry_backoff=True,
    soft_time_limit=60,
    time_limit=120,
)
def generate_and_send_certificate(registration_id: int) -> None:
    try:
        registration = WarrantyRegistration.objects.prefetch_related(
            "paint_pairs__topcoat", "paint_pairs__basecoat"
        ).get(pk=registration_id)
    except WarrantyRegistration.DoesNotExist:
        logger.warning("Warranty registration not found for certificate generation: %s", registration_id)
        return

    content = generate_warranty_certificate(registration)
    registration.warranty_certificate.save(content.name, content, save=True)
    logger.info("Warranty certificate generated for registration id %s", registration_id)


@shared_task(
    autoretry_for=(Exception,),
    max_retries=3,
    retry_backoff=True,
    soft_time_limit=30,
    time_limit=60,
)
def send_whatsapp_status_notification(phone: str, message: str) -> None:
    logger.info("WhatsApp status notification queued for phone ending with %s", phone[-4:] if phone else "unknown")
    logger.info("WhatsApp notification send is not implemented in this workspace yet.")
