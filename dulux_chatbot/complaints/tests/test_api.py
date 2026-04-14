from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from dulux_chatbot.chatbot.choices import FlowType
from dulux_chatbot.chatbot.models import WhatsAppSession
from dulux_chatbot.complaints.choices import ComplaintStatus
from dulux_chatbot.complaints.tests.factories import (
    create_chat_message,
    create_complaint,
    create_complaint_image,
    create_image,
    create_user,
)
from dulux_chatbot.users.choices import UserRole
from dulux_chatbot.warranty.tests.factories import create_registration


class ComplaintAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = create_user()
        self.list_url = reverse("complaint_list_create")

    def test_complaint_list_requires_authentication(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_complaint(self):
        image = create_image()
        registration = create_registration()
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.list_url,
            {
                "registration": registration.id,
                "phone_number": registration.phone_number,
                "customer_name": "Complaint Customer",
                "subject": "Damaged paint",
                "description": "Description",
                "images": [{"image_id": image.id}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch("dulux_chatbot.complaints.api.v1.views.broadcast_complaint_created")
    def test_create_complaint_broadcasts_new_complaint_to_queue(self, broadcast_mock):
        image = create_image()
        registration = create_registration()
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.list_url,
            {
                "registration": registration.id,
                "phone_number": registration.phone_number,
                "customer_name": "Complaint Customer",
                "subject": "Damaged paint",
                "description": "Description",
                "images": [{"image_id": image.id}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        broadcast_mock.assert_called_once()
        broadcasted_complaint = broadcast_mock.call_args.kwargs["complaint"]
        self.assertEqual(broadcasted_complaint.customer_name, "Complaint Customer")
        self.assertEqual(broadcasted_complaint.subject, "Damaged paint")

    def test_create_complaint_with_invalid_phone_number_returns_400(self):
        registration = create_registration()
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.list_url,
            {
                "registration": registration.id,
                "phone_number": "3001234567",
                "customer_name": "Complaint Customer",
                "subject": "Damaged paint",
                "description": "Description",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["phone_number"][0],
            "Phone number must start with 92 and include 10 digits after it.",
        )

    def test_update_complaint_status(self):
        complaint = create_complaint()
        assigned_user = create_user(email="assigned@example.com")
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("complaint_detail", kwargs={"pk": complaint.id}),
            {"action": "ASSIGN", "assigned_to": assigned_user.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ComplaintStatus.IN_PROGRESS)

    def test_close_allows_empty_closure_note(self):
        complaint = create_complaint(status=ComplaintStatus.RESOLVED)
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("complaint_detail", kwargs={"pk": complaint.id}),
            {"action": "CLOSE"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ComplaintStatus.CLOSED)

    def test_resolve_complaint_ends_matching_whatsapp_session(self):
        complaint = create_complaint(status=ComplaintStatus.IN_PROGRESS, phone_number="923214840045")
        WhatsAppSession.objects.create(
            phone_number=complaint.phone_number,
            flow=FlowType.COMPLAINT,
            current_step="chat",
            session_data={"complaint_id": complaint.id},
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("complaint_detail", kwargs={"pk": complaint.id}),
            {"action": "RESOLVE"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session = WhatsAppSession.objects.get(phone_number=complaint.phone_number)
        self.assertIsNone(session.flow)
        self.assertEqual(session.current_step, "menu")
        self.assertEqual(session.session_data, {})

    def test_close_complaint_ends_matching_whatsapp_session(self):
        complaint = create_complaint(status=ComplaintStatus.RESOLVED, phone_number="923214840046")
        WhatsAppSession.objects.create(
            phone_number=complaint.phone_number,
            flow=FlowType.COMPLAINT,
            current_step="chat",
            session_data={"complaint_id": complaint.id},
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("complaint_detail", kwargs={"pk": complaint.id}),
            {"action": "CLOSE", "closure_note": "Complaint has been resolved."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session = WhatsAppSession.objects.get(phone_number=complaint.phone_number)
        self.assertIsNone(session.flow)
        self.assertEqual(session.current_step, "menu")
        self.assertEqual(session.session_data, {})

    def test_resolve_complaint_does_not_end_different_complaint_session(self):
        complaint = create_complaint(status=ComplaintStatus.IN_PROGRESS, phone_number="923214840047")
        WhatsAppSession.objects.create(
            phone_number=complaint.phone_number,
            flow=FlowType.COMPLAINT,
            current_step="chat",
            session_data={"complaint_id": complaint.id + 1},
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("complaint_detail", kwargs={"pk": complaint.id}),
            {"action": "RESOLVE"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session = WhatsAppSession.objects.get(phone_number=complaint.phone_number)
        self.assertEqual(session.flow, FlowType.COMPLAINT)
        self.assertEqual(session.current_step, "chat")
        self.assertEqual(session.session_data, {"complaint_id": complaint.id + 1})

    @patch("dulux_chatbot.complaints.api.v1.views.WhatsAppClient.send_text")
    def test_list_and_create_messages(self, send_text_mock):
        complaint = create_complaint()
        create_chat_message(complaint=complaint)
        self.client.force_authenticate(user=self.user)
        url = reverse("complaint_message_list_create", kwargs={"complaint_id": complaint.id})

        list_response = self.client.get(url)
        create_response = self.client.post(url, {"text": "Need an update"}, format="json")

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        send_text_mock.assert_called_once_with(complaint.phone_number, "Need an update")

    def test_list_messages_returns_messages_and_images_in_one_list(self):
        complaint = create_complaint()
        message = create_chat_message(complaint=complaint, text="Customer support message")
        complaint_image = create_complaint_image(complaint=complaint)
        self.client.force_authenticate(user=self.user)
        url = reverse("complaint_message_list_create", kwargs={"complaint_id": complaint.id})

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        item_types = {item["type"] for item in response.data}
        self.assertEqual(item_types, {"MESSAGE", "IMAGE"})
        message_item = next(item for item in response.data if item["type"] == "MESSAGE")
        image_item = next(item for item in response.data if item["type"] == "IMAGE")
        self.assertEqual(message_item["id"], message.id)
        self.assertEqual(message_item["text"], "Customer support message")
        self.assertIsNone(message_item["image"])
        self.assertEqual(image_item["id"], complaint_image.id)
        self.assertEqual(image_item["sender"], "CUSTOMER")
        self.assertEqual(image_item["image"]["id"], complaint_image.image_id)

    @patch("dulux_chatbot.complaints.api.v1.views.WhatsAppClient.send_text")
    def test_create_message_sends_text_to_whatsapp(self, send_text_mock):
        complaint = create_complaint(phone_number="923214840043")
        self.client.force_authenticate(user=self.user)
        url = reverse("complaint_message_list_create", kwargs={"complaint_id": complaint.id})

        response = self.client.post(url, {"text": "Need an update"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        send_text_mock.assert_called_once_with(complaint.phone_number, "Need an update")

    @patch("dulux_chatbot.complaints.api.v1.views.WhatsAppClient.send_text")
    def test_create_message_reactivates_customer_complaint_session(self, send_text_mock):
        complaint = create_complaint(phone_number="923214840044")
        WhatsAppSession.objects.create(
            phone_number=complaint.phone_number,
            flow=FlowType.REGISTRATION,
            current_step="email",
            session_data={"email": "customer@example.com"},
        )
        self.client.force_authenticate(user=self.user)
        url = reverse("complaint_message_list_create", kwargs={"complaint_id": complaint.id})

        response = self.client.post(url, {"text": "Please share an update"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        session = WhatsAppSession.objects.get(phone_number=complaint.phone_number)
        self.assertEqual(session.flow, FlowType.COMPLAINT)
        self.assertEqual(session.current_step, "chat")
        self.assertEqual(session.session_data, {"complaint_id": complaint.id})


class LiveChatCardCountAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cs_user = create_user(email="live-chat-cs@example.com", role=UserRole.CS_AGENT)
        self.quality_user = create_user(email="live-chat-quality@example.com", role=UserRole.QUALITY_REVIEWER)
        self.live_chat_counts_url = reverse("live_chat_card_counts")

    def test_live_chat_card_counts_require_cs_or_admin(self):
        self.client.force_authenticate(user=self.quality_user)

        response = self.client.get(self.live_chat_counts_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_live_chat_card_counts_return_expected_summary(self):
        create_complaint(status=ComplaintStatus.OPEN, phone_number="923001111111")
        create_complaint(status=ComplaintStatus.IN_PROGRESS, assigned_to=self.cs_user, phone_number="923001111112")
        create_complaint(status=ComplaintStatus.CLOSED, assigned_to=self.cs_user, phone_number="923001111113")

        self.client.force_authenticate(user=self.cs_user)
        response = self.client.get(self.live_chat_counts_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"open": 1, "in_progress": 1, "closed": 1})

    def test_live_chat_card_counts_support_date_and_agent_filters(self):
        active_for_user = create_complaint(
            status=ComplaintStatus.IN_PROGRESS,
            assigned_to=self.cs_user,
            phone_number="923001111114",
        )
        old_complaint = create_complaint(status=ComplaintStatus.OPEN, phone_number="923001111115")
        old_complaint.created = timezone.now() - timedelta(days=7)
        old_complaint.save(update_fields=["created"])

        self.client.force_authenticate(user=self.cs_user)
        response = self.client.get(
            self.live_chat_counts_url,
            {
                "date_from": timezone.localdate().isoformat(),
                "date_to": timezone.localdate().isoformat(),
                "agent_id": self.cs_user.id,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"open": 0, "in_progress": 1, "closed": 0})
        self.assertEqual(active_for_user.assigned_to_id, self.cs_user.id)

    def test_live_chat_card_counts_reject_invalid_date_range(self):
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(
            self.live_chat_counts_url,
            {"date_from": "2026-04-10", "date_to": "2026-04-01"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "date_from must be less than or equal to date_to.")
