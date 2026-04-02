from celery import shared_task

from dulux_chatbot.warranty.models import WarrantyRegistration
from dulux_chatbot.warranty.services.certificate import generate_warranty_certificate


@shared_task
def generate_and_send_certificate(registration_id: int) -> None:
    registration = WarrantyRegistration.objects.prefetch_related("paint_pairs__topcoat", "paint_pairs__basecoat").get(
        pk=registration_id
    )
    content = generate_warranty_certificate(registration)
    registration.warranty_certificate.save(content.name, content, save=True)


@shared_task
def send_whatsapp_status_notification(_phone: str, _message: str) -> None:
    return None
