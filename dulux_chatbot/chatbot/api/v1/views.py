import hashlib
import hmac
import logging

from django.conf import settings
from django.http import HttpResponse
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from dulux_chatbot.chatbot.handlers.message_parser import parse_incoming_message
from dulux_chatbot.chatbot.models import ProcessedMessage, WhatsAppSession
from dulux_chatbot.chatbot.tasks import dispatch_whatsapp_message


logger = logging.getLogger("dulux_chatbot")
META_SIGNATURE_PREFIX = "sha256="


def _webhook_signature_is_valid(*, raw_body: bytes, signature_header: str, app_secret: str) -> bool:
    if not signature_header.startswith(META_SIGNATURE_PREFIX):
        return False
    expected_signature = hmac.HMAC(
        key=app_secret.encode("utf-8"),
        msg=raw_body,
        digestmod=hashlib.sha256,
    ).hexdigest()
    received_signature = signature_header[len(META_SIGNATURE_PREFIX) :]
    return hmac.compare_digest(received_signature, expected_signature)


# TODO(audit PERF-01 Medium): Webhook handler runs dispatch() synchronously. If DB is
# slow or select_for_update contention is high, Meta will timeout (20s) and retry.
# ProcessedMessage deduplication catches retries, but the response is delayed. For high
# throughput, consider deferring dispatch to a Celery task and returning 200 immediately.
# At current scale this is likely acceptable, but monitor webhook response latency.
class WhatsAppWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, *_args, **_kwargs):
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge", "")

        if mode == "subscribe" and token and hmac.compare_digest(token, settings.WHATSAPP_VERIFY_TOKEN):
            return HttpResponse(challenge)
        return HttpResponse(status=403)

    def post(self, request, *_args, **_kwargs):
        app_secret = settings.WHATSAPP_APP_SECRET
        if app_secret:
            signature_header = request.META.get("HTTP_X_HUB_SIGNATURE_256", "")
            if not _webhook_signature_is_valid(
                raw_body=request.body,
                signature_header=signature_header,
                app_secret=app_secret,
            ):
                logger.warning("WhatsApp webhook rejected due to invalid signature.")
                return Response(status=403)

        message = parse_incoming_message(request.data)
        if message is None:
            return Response(status=200)

        message_id = message.get("message_id")
        if not message_id:
            return Response(status=200)

        processed_message, created = ProcessedMessage.objects.get_or_create(message_id=message_id)
        if not created:
            return Response(status=200)

        phone_number = str(message.get("from") or "").strip()
        if not phone_number:
            return Response(status=200)

        session, _ = WhatsAppSession.objects.get_or_create(phone_number=phone_number)
        dispatch_whatsapp_message.delay(session.id, message)
        return Response({"processed_message_id": processed_message.id}, status=200)
