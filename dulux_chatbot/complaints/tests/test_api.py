from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from dulux_chatbot.chatbot.choices import FlowType
from dulux_chatbot.chatbot.constants import MAIN_MENU_TEXT
from dulux_chatbot.chatbot.models import WhatsAppSession
from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppAPIError
from dulux_chatbot.complaints.choices import ComplaintStatus, ComplaintSubject
from dulux_chatbot.complaints.models import ChatMessage, Complaint
from dulux_chatbot.complaints.tasks import send_complaint_closed_notification
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
                "subject": ComplaintSubject.PRODUCT_COMPLAINT,
                "description": "Description",
                "images": [{"image_id": image.id}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_complaint_allows_zero_images(self):
        registration = create_registration()
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.list_url,
            {
                "registration": registration.id,
                "phone_number": registration.phone_number,
                "customer_name": "Complaint Customer",
                "subject": ComplaintSubject.PRODUCT_COMPLAINT,
                "description": "Description",
                "images": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        complaint = Complaint.objects.get(
            registration=registration,
            phone_number=registration.phone_number,
            subject=ComplaintSubject.PRODUCT_COMPLAINT,
        )
        self.assertEqual(complaint.images.count(), 0)

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
                "subject": ComplaintSubject.PRODUCT_COMPLAINT,
                "description": "Description",
                "images": [{"image_id": image.id}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        broadcast_mock.assert_called_once()
        broadcasted_complaint = broadcast_mock.call_args.kwargs["complaint"]
        self.assertEqual(broadcasted_complaint.customer_name, "Complaint Customer")
        self.assertEqual(broadcasted_complaint.subject, ComplaintSubject.PRODUCT_COMPLAINT)

    def test_create_complaint_with_invalid_phone_number_returns_400(self):
        registration = create_registration()
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.list_url,
            {
                "registration": registration.id,
                "phone_number": "3001234567",
                "customer_name": "Complaint Customer",
                "subject": ComplaintSubject.PRODUCT_COMPLAINT,
                "description": "Description",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["phone_number"][0],
            "Phone number must start with 92 and include 10 digits after it.",
        )

    def test_create_complaint_with_invalid_subject_returns_400(self):
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
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("subject", response.data)

    def test_retrieve_complaint_detail(self):
        registration = create_registration()
        complaint = create_complaint(registration=registration)
        message = create_chat_message(complaint=complaint, text="Customer support message")
        complaint_image = create_complaint_image(complaint=complaint)
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("complaint_detail", kwargs={"pk": complaint.id}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], complaint.id)
        self.assertEqual(response.data["registration_number"], registration.registration_code)
        self.assertEqual(response.data["messages"][0]["id"], message.id)
        self.assertEqual(response.data["images"][0]["id"], complaint_image.id)

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
        self.assertEqual(response.data["assigned_to"], assigned_user.id)
        complaint.refresh_from_db()
        self.assertEqual(complaint.assigned_to_id, assigned_user.id)

    def test_open_complaint_cannot_be_closed_directly(self):
        complaint = create_complaint(status=ComplaintStatus.OPEN)
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("complaint_detail", kwargs={"pk": complaint.id}),
            {"action": "CLOSE"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["action"][0], "Cannot transition complaint from OPEN using CLOSE.")
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, ComplaintStatus.OPEN)

    def test_closed_complaint_cannot_be_assigned(self):
        complaint = create_complaint(status=ComplaintStatus.CLOSED)
        assigned_user = create_user(email="closed-assigned@example.com")
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("complaint_detail", kwargs={"pk": complaint.id}),
            {"action": "ASSIGN", "assigned_to": assigned_user.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["action"][0], "Cannot transition complaint from CLOSED using ASSIGN.")
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, ComplaintStatus.CLOSED)
        self.assertIsNone(complaint.assigned_to_id)

    def test_assign_complaint_requires_assigned_user(self):
        complaint = create_complaint(status=ComplaintStatus.OPEN)
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("complaint_detail", kwargs={"pk": complaint.id}),
            {"action": "ASSIGN"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["assigned_to"][0], "Assigned user is required for assign action.")

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

    @patch("dulux_chatbot.complaints.api.v1.serializers.send_complaint_closed_notification.delay")
    def test_close_complaint_ends_matching_whatsapp_session(self, notification_mock):
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
        notification_mock.assert_called_once_with(complaint.phone_number, complaint.subject)

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
    def test_create_message_rejects_blank_text_without_sending_whatsapp(self, send_text_mock):
        complaint = create_complaint(phone_number="923214840050")
        self.client.force_authenticate(user=self.user)
        url = reverse("complaint_message_list_create", kwargs={"complaint_id": complaint.id})

        response = self.client.post(url, {"text": "   "}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("text", response.data)
        send_text_mock.assert_not_called()
        self.assertFalse(ChatMessage.objects.filter(complaint=complaint).exists())

    @patch("dulux_chatbot.complaints.api.v1.views.WhatsAppClient.send_text")
    def test_create_message_returns_404_for_unknown_complaint_without_sending_whatsapp(self, send_text_mock):
        self.client.force_authenticate(user=self.user)
        url = reverse("complaint_message_list_create", kwargs={"complaint_id": 999999})

        response = self.client.post(url, {"text": "Need an update"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        send_text_mock.assert_not_called()

    @patch("dulux_chatbot.complaints.api.v1.views.WhatsAppClient.send_text")
    def test_create_message_does_not_save_when_whatsapp_send_fails(self, send_text_mock):
        send_text_mock.side_effect = WhatsAppAPIError("WhatsApp send failed.")
        complaint = create_complaint(phone_number="923214840049")
        self.client.force_authenticate(user=self.user)
        url = reverse("complaint_message_list_create", kwargs={"complaint_id": complaint.id})

        response = self.client.post(url, {"text": "Need an update"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data["detail"], "Message could not be sent to WhatsApp.")
        self.assertFalse(ChatMessage.objects.filter(complaint=complaint, text="Need an update").exists())

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

    @patch("dulux_chatbot.complaints.tasks.send_whatsapp_main_menu.apply_async")
    @patch("dulux_chatbot.complaints.tasks.WhatsAppClient")
    def test_complaint_closed_notification_sends_message_and_main_menu(self, client_mock, main_menu_mock):
        phone_number = "923214840048"
        WhatsAppSession.objects.create(
            phone_number=phone_number,
            flow=FlowType.COMPLAINT,
            current_step="chat",
            session_data={"complaint_id": 123},
        )

        send_complaint_closed_notification(phone_number, ComplaintSubject.PRODUCT_COMPLAINT)

        session = WhatsAppSession.objects.get(phone_number=phone_number)
        self.assertIsNone(session.flow)
        self.assertEqual(session.current_step, "menu")
        self.assertEqual(session.session_data, {})
        client_mock.return_value.send_text.assert_called_once_with(
            phone_number,
            "Your complaint with subject: Product Complaint has been closed.",
        )
        main_menu_mock.assert_called_once()
        self.assertEqual(main_menu_mock.call_args.kwargs["countdown"], 2)
        self.assertEqual(main_menu_mock.call_args.kwargs["args"], [phone_number, MAIN_MENU_TEXT])

    def test_complaint_list_query_count_stays_constant(self):
        for index in range(3):
            registration = create_registration(phone_number=f"92300222{index:04d}")
            assigned_to = create_user(email=f"list-assigned-{index}@example.com")
            complaint = create_complaint(
                registration=registration,
                assigned_to=assigned_to,
                phone_number=registration.phone_number,
            )
            create_complaint_image(complaint=complaint)
        self.client.force_authenticate(user=self.user)

        with self.assertNumQueries(4):
            response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)


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
        with self.assertNumQueries(1):
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
        self.assertEqual(response.data["non_field_errors"][0], "date_from must be less than or equal to date_to.")
