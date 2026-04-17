import os

from unittest.mock import Mock, patch

import requests

from constance.test import override_config
from django.test import SimpleTestCase, override_settings

from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppAPIError, WhatsAppClient


class WhatsAppClientTests(SimpleTestCase):
    @patch("dulux_chatbot.chatbot.services.whatsapp_client.REQUEST_SESSION.post")
    def test_send_text_posts_payload(self, post_mock):
        response = Mock()
        response.json.return_value = {"messages": []}
        response.raise_for_status.return_value = None
        post_mock.return_value = response

        client = WhatsAppClient()
        result = client.send_text("923001234567", "Hello")

        self.assertEqual(result, {"messages": []})
        post_mock.assert_called_once()

    @override_config(WHATSAPP_API_BASE_URL="https://sandbox.meta.test/v99.0/")
    @override_settings(WHATSAPP_PHONE_NUMBER_ID="test-phone-number-id")
    @patch("dulux_chatbot.chatbot.services.whatsapp_client.REQUEST_SESSION.post")
    def test_send_text_uses_configured_api_base_url(self, post_mock):
        response = Mock()
        response.json.return_value = {"messages": []}
        response.raise_for_status.return_value = None
        post_mock.return_value = response

        client = WhatsAppClient()
        client.send_text("923001234567", "Hello")

        self.assertEqual(
            post_mock.call_args.args[0],
            "https://sandbox.meta.test/v99.0/test-phone-number-id/messages",
        )

    @patch("dulux_chatbot.chatbot.services.whatsapp_client.REQUEST_SESSION.post")
    def test_send_text_raises_api_error_on_failure(self, post_mock):
        post_mock.side_effect = requests.RequestException("boom")

        client = WhatsAppClient()

        with self.assertRaises(WhatsAppAPIError):
            client.send_text("923001234567", "Hello")

    @patch("dulux_chatbot.chatbot.services.whatsapp_client.REQUEST_SESSION.post")
    def test_send_document_uses_absolute_media_url(self, post_mock):
        response = Mock()
        response.json.return_value = {"messages": []}
        response.raise_for_status.return_value = None
        post_mock.return_value = response

        self.addCleanup(lambda: os.environ.pop("CERTIFICATE_MEDIA_URL", None))
        os.environ["CERTIFICATE_MEDIA_URL"] = "https://example-media.ngrok-free.app"
        client = WhatsAppClient()
        client.send_document("923001234567", "/django-media/certificates/sample.pdf", "sample.pdf")

        payload = post_mock.call_args.kwargs["json"]
        self.assertEqual(
            payload["document"]["link"],
            "https://example-media.ngrok-free.app/django-media/certificates/sample.pdf",
        )
