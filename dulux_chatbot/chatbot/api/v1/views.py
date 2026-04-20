import hmac
import logging

from django.conf import settings
from django.http import HttpResponse
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from dulux_chatbot.chatbot.handlers.dispatcher import dispatch
from dulux_chatbot.chatbot.handlers.message_parser import parse_incoming_message
from dulux_chatbot.chatbot.models import ProcessedMessage, WhatsAppSession
from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppClient


logger = logging.getLogger("dulux_chatbot")


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

    # TODO(audit WA-01 Critical): Missing X-Hub-Signature-256 verification on webhook POST
    # Meta signs every webhook payload with HMAC-SHA256 using your app secret. Without
    # verifying this header, any internet client can forge webhook payloads — injecting
    # fake messages, triggering flows, or creating bogus registrations. Verify the
    # signature before processing. See: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
    def post(self, request, *_args, **_kwargs):
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
        client = WhatsAppClient()
        try:
            dispatch(session=session, message=message, client=client)
        except Exception as e:
            logger.exception("WhatsApp webhook dispatch failed: %s", e)
            try:
                client.send_text(phone_number, "Something went wrong. Please try again later.")
            except Exception as fallback_error:
                logger.exception("WhatsApp webhook fallback message failed: %s", fallback_error)
        return Response({"processed_message_id": processed_message.id}, status=200)
