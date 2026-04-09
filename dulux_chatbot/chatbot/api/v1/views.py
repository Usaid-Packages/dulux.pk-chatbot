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
from dulux_chatbot.core.validators import normalize_pakistan_phone_number


logger = logging.getLogger("dulux_chatbot")


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
        message = parse_incoming_message(request.data)
        if message is None:
            return Response(status=200)

        message_id = message.get("message_id")
        if not message_id:
            return Response(status=200)

        processed_message, created = ProcessedMessage.objects.get_or_create(message_id=message_id)
        if not created:
            return Response(status=200)

        phone_number = normalize_pakistan_phone_number(str(message.get("from") or "").strip())
        if not phone_number:
            return Response(status=200)

        session, _ = WhatsAppSession.objects.get_or_create(phone_number=phone_number)
        try:
            dispatch(session=session, message=message, client=WhatsAppClient())
        except Exception:
            logger.exception("WhatsApp webhook dispatch failed.")
            WhatsAppClient().send_text(phone_number, "Something went wrong. Please try again later.")
        return Response({"processed_message_id": processed_message.id}, status=200)
