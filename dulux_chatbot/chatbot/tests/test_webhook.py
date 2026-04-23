import hashlib
import hmac
import json

from unittest.mock import patch

from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import reverse

from dulux_chatbot.chatbot.models import ProcessedMessage, WhatsAppSession
from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppAPIError
from dulux_chatbot.chatbot.tasks import dispatch_whatsapp_message


def signed_webhook_payload(payload: dict, *, secret: str) -> tuple[str, str]:
    body = json.dumps(payload, separators=(",", ":"))
    signature = hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
    return body, f"sha256={signature}"


class WhatsAppWebhookTests(TestCase):
    def test_verify_webhook(self):
        response = self.client.get(
            reverse("whatsapp_webhook"),
            {"hub.mode": "subscribe", "hub.verify_token": settings.WHATSAPP_VERIFY_TOKEN, "hub.challenge": "123"},
        )

        self.assertEqual(response.status_code, 200)

    def test_verify_webhook_rejects_invalid_token(self):
        response = self.client.get(
            reverse("whatsapp_webhook"),
            {"hub.mode": "subscribe", "hub.verify_token": "wrong-token", "hub.challenge": "123"},
        )

        self.assertEqual(response.status_code, 403)

    @override_settings(WHATSAPP_APP_SECRET="")
    @patch("dulux_chatbot.chatbot.api.v1.views.dispatch_whatsapp_message.delay")
    def test_post_processes_message(self, dispatch_delay_mock):
        response = self.client.post(
            reverse("whatsapp_webhook"),
            {
                "entry": [
                    {
                        "changes": [
                            {
                                "value": {
                                    "messages": [
                                        {
                                            "id": "msg-1",
                                            "from": "923001234567",
                                            "type": "text",
                                            "text": {"body": "1"},
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(ProcessedMessage.objects.filter(message_id="msg-1").exists())
        session = WhatsAppSession.objects.get(phone_number="923001234567")
        dispatch_delay_mock.assert_called_once_with(
            session.id,
            {
                "message_id": "msg-1",
                "from": "923001234567",
                "type": "text",
                "text": "1",
                "media_id": None,
                "interactive_id": None,
            },
        )

    @override_settings(WHATSAPP_APP_SECRET="test-app-secret")
    @patch("dulux_chatbot.chatbot.api.v1.views.dispatch_whatsapp_message.delay")
    def test_post_processes_message_with_valid_signature(self, dispatch_delay_mock):
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "id": "msg-signed",
                                        "from": "923001234567",
                                        "type": "text",
                                        "text": {"body": "1"},
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        body, signature = signed_webhook_payload(payload, secret="test-app-secret")

        response = self.client.post(
            reverse("whatsapp_webhook"),
            body,
            content_type="application/json",
            HTTP_X_HUB_SIGNATURE_256=signature,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(ProcessedMessage.objects.filter(message_id="msg-signed").exists())
        session = WhatsAppSession.objects.get(phone_number="923001234567")
        dispatch_delay_mock.assert_called_once_with(
            session.id,
            {
                "message_id": "msg-signed",
                "from": "923001234567",
                "type": "text",
                "text": "1",
                "media_id": None,
                "interactive_id": None,
            },
        )

    @override_settings(WHATSAPP_APP_SECRET="test-app-secret")
    @patch("dulux_chatbot.chatbot.api.v1.views.dispatch_whatsapp_message.delay")
    def test_post_rejects_invalid_signature(self, dispatch_delay_mock):
        response = self.client.post(
            reverse("whatsapp_webhook"),
            json.dumps({"entry": []}),
            content_type="application/json",
            HTTP_X_HUB_SIGNATURE_256="sha256=invalid",
        )

        self.assertEqual(response.status_code, 403)
        dispatch_delay_mock.assert_not_called()

    @override_settings(WHATSAPP_APP_SECRET="test-app-secret")
    @patch("dulux_chatbot.chatbot.api.v1.views.dispatch_whatsapp_message.delay")
    def test_post_rejects_missing_signature(self, dispatch_delay_mock):
        response = self.client.post(
            reverse("whatsapp_webhook"),
            json.dumps({"entry": []}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        dispatch_delay_mock.assert_not_called()

    @override_settings(WHATSAPP_APP_SECRET="")
    @patch("dulux_chatbot.chatbot.api.v1.views.dispatch_whatsapp_message.delay")
    def test_post_ignores_duplicate_message_id(self, dispatch_delay_mock):
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "id": "msg-dup",
                                        "from": "923001234567",
                                        "type": "text",
                                        "text": {"body": "1"},
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }

        first_response = self.client.post(reverse("whatsapp_webhook"), payload, content_type="application/json")
        second_response = self.client.post(reverse("whatsapp_webhook"), payload, content_type="application/json")

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(ProcessedMessage.objects.filter(message_id="msg-dup").count(), 1)
        dispatch_delay_mock.assert_called_once()

    @patch("dulux_chatbot.chatbot.tasks.WhatsAppClient")
    @patch("dulux_chatbot.chatbot.handlers.dispatcher.dispatch")
    def test_dispatch_task_handles_dispatch_and_fallback_whatsapp_failures(self, dispatch_mock, client_mock):
        dispatch_mock.side_effect = WhatsAppAPIError("WhatsApp dispatch failed.")
        client_mock.return_value.send_text.side_effect = WhatsAppAPIError("WhatsApp fallback failed.")
        session = WhatsAppSession.objects.create(phone_number="923001234567")
        message = {
            "message_id": "msg-fallback-fail",
            "from": "923001234567",
            "type": "text",
            "text": "1",
        }

        dispatch_whatsapp_message(session.id, message)

        dispatch_mock.assert_called_once()
        client_mock.return_value.send_text.assert_called_once_with(
            "923001234567",
            "Something went wrong. Please try again later.",
        )

    @patch("dulux_chatbot.chatbot.tasks.WhatsAppClient")
    @patch("dulux_chatbot.chatbot.handlers.dispatcher.dispatch")
    def test_dispatch_task_skips_missing_session(self, dispatch_mock, client_mock):
        dispatch_whatsapp_message(99999, {"message_id": "missing-session"})

        dispatch_mock.assert_not_called()
        client_mock.assert_not_called()
