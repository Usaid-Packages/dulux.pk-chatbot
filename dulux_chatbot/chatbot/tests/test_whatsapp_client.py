from unittest.mock import Mock, patch

import requests

from django.test import SimpleTestCase, override_settings

from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppAPIError, WhatsAppClient


class WhatsAppClientTests(SimpleTestCase):
    def _mock_response(self, payload):
        response = Mock()
        response.json.return_value = payload
        response.raise_for_status.return_value = None
        return response

    def test_send_text_posts_payload(self):
        client = WhatsAppClient()
        with patch.object(client._session, "post", return_value=self._mock_response({"messages": []})) as post_mock:
            result = client.send_text("923001234567", "Hello")

        self.assertEqual(result, {"messages": []})
        post_mock.assert_called_once()

    def test_send_text_raises_api_error_on_failure(self):
        client = WhatsAppClient()
        with patch.object(client._session, "post", side_effect=requests.RequestException("boom")):
            with self.assertRaises(WhatsAppAPIError):
                client.send_text("923001234567", "Hello")

    @override_settings(WHATSAPP_PUBLIC_MEDIA_BASE_URL="https://example-media.ngrok-free.app")
    def test_send_document_uses_absolute_media_url(self):
        client = WhatsAppClient()
        with patch.object(client._session, "post", return_value=self._mock_response({"messages": []})) as post_mock:
            client.send_document("923001234567", "/django-media/certificates/sample.pdf", "sample.pdf")

        payload = post_mock.call_args.kwargs["json"]
        self.assertEqual(
            payload["document"]["link"],
            "https://example-media.ngrok-free.app/django-media/certificates/sample.pdf",
        )

    @override_settings(WHATSAPP_PUBLIC_MEDIA_BASE_URL="")
    def test_send_document_raises_when_media_base_url_missing(self):
        client = WhatsAppClient()
        with self.assertRaises(WhatsAppAPIError):
            client.send_document("923001234567", "/django-media/certificates/sample.pdf", "sample.pdf")
