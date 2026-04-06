from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from dulux_chatbot.complaints.choices import ComplaintStatus
from dulux_chatbot.complaints.tests.factories import create_chat_message, create_complaint, create_image, create_user
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

    def test_close_requires_closure_note(self):
        complaint = create_complaint(status=ComplaintStatus.RESOLVED)
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("complaint_detail", kwargs={"pk": complaint.id}),
            {"action": "CLOSE"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_and_create_messages(self):
        complaint = create_complaint()
        create_chat_message(complaint=complaint)
        self.client.force_authenticate(user=self.user)
        url = reverse("complaint_message_list_create", kwargs={"complaint_id": complaint.id})

        list_response = self.client.get(url)
        create_response = self.client.post(url, {"text": "Need an update"}, format="json")

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
