from unittest.mock import patch

from django.conf import settings
from django.test import TestCase
from django.urls import reverse

from dulux_chatbot.chatbot.models import ProcessedMessage, WhatsAppSession


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

    @patch("dulux_chatbot.chatbot.api.v1.views.WhatsAppClient.send_text")
    @patch("dulux_chatbot.chatbot.api.v1.views.dispatch")
    def test_post_processes_message(self, dispatch_mock, _send_text_mock):
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
        self.assertTrue(WhatsAppSession.objects.filter(phone_number="923001234567").exists())
        dispatch_mock.assert_called_once()

    @patch("dulux_chatbot.chatbot.api.v1.views.WhatsAppClient.send_text")
    @patch("dulux_chatbot.chatbot.api.v1.views.dispatch")
    def test_post_normalizes_incoming_phone_number_for_session_lookup(self, dispatch_mock, _send_text_mock):
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
                                            "id": "msg-2",
                                            "from": "03001234567",
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
        self.assertTrue(WhatsAppSession.objects.filter(phone_number="923001234567").exists())
        dispatch_mock.assert_called_once()

    @patch("dulux_chatbot.chatbot.api.v1.views.dispatch")
    def test_post_ignores_duplicate_message_id(self, dispatch_mock):
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
        dispatch_mock.assert_called_once()
