from unittest.mock import Mock, patch

import requests

from django.test import SimpleTestCase

from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppAPIError, WhatsAppClient


class WhatsAppClientTests(SimpleTestCase):
    @patch("dulux_chatbot.chatbot.services.whatsapp_client.requests.post")
    def test_send_text_posts_payload(self, post_mock):
        response = Mock()
        response.json.return_value = {"messages": []}
        response.raise_for_status.return_value = None
        post_mock.return_value = response

        client = WhatsAppClient()
        result = client.send_text("923001234567", "Hello")

        self.assertEqual(result, {"messages": []})
        post_mock.assert_called_once()

    @patch("dulux_chatbot.chatbot.services.whatsapp_client.requests.post")
    def test_send_text_raises_api_error_on_failure(self, post_mock):
        post_mock.side_effect = requests.RequestException("boom")

        client = WhatsAppClient()

        with self.assertRaises(WhatsAppAPIError):
            client.send_text("923001234567", "Hello")
