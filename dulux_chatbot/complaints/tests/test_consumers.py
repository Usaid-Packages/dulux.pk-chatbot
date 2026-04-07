from unittest.mock import patch
from urllib.parse import urlencode

from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase
from rest_framework_simplejwt.tokens import AccessToken

from config.asgi import application
from dulux_chatbot.complaints.choices import MessageSender
from dulux_chatbot.complaints.models import ChatMessage
from dulux_chatbot.complaints.tests.factories import create_complaint, create_user


class ComplaintConsumerTests(TransactionTestCase):
    async_capable = True

    async def test_consumer_requires_authentication(self):
        complaint = await sync_to_async(create_complaint)()
        communicator = WebsocketCommunicator(application, f"/ws/complaints/{complaint.id}/chat/")

        connected, _ = await communicator.connect()

        self.assertFalse(connected)

    async def test_consumer_accepts_authenticated_user(self):
        complaint = await sync_to_async(create_complaint)()
        user = await sync_to_async(create_user)()
        token = str(AccessToken.for_user(user))
        query = urlencode({"token": token})
        communicator = WebsocketCommunicator(application, f"/ws/complaints/{complaint.id}/chat/?{query}")

        connected, _ = await communicator.connect()

        self.assertTrue(connected)
        await communicator.disconnect()

    async def test_consumer_rejects_missing_complaint(self):
        user = await sync_to_async(create_user)()
        token = str(AccessToken.for_user(user))
        query = urlencode({"token": token})
        communicator = WebsocketCommunicator(application, f"/ws/complaints/9999/chat/?{query}")

        connected, _ = await communicator.connect()

        self.assertFalse(connected)

    @patch("dulux_chatbot.complaints.consumers.WhatsAppClient.send_text")
    async def test_consumer_sends_agent_message_to_whatsapp_and_broadcasts(self, send_text_mock):
        complaint = await sync_to_async(create_complaint)(phone_number="923214840043")
        user = await sync_to_async(create_user)()
        token = str(AccessToken.for_user(user))
        query = urlencode({"token": token})
        communicator = WebsocketCommunicator(application, f"/ws/complaints/{complaint.id}/chat/?{query}")

        connected, _ = await communicator.connect()

        self.assertTrue(connected)
        await communicator.send_json_to({"text": "Hello from CS"})
        response = await communicator.receive_json_from()

        self.assertEqual(response["sender"], MessageSender.CS_AGENT)
        self.assertEqual(response["text"], "Hello from CS")
        send_text_mock.assert_called_once_with("923214840043", "Hello from CS")
        self.assertTrue(
            await sync_to_async(
                ChatMessage.objects.filter(
                    complaint_id=complaint.id,
                    sender=MessageSender.CS_AGENT,
                    text="Hello from CS",
                ).exists
            )()
        )
        await communicator.disconnect()
