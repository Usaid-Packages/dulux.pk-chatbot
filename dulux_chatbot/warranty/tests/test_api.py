from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from dulux_chatbot.products.tests.factories import create_product
from dulux_chatbot.warranty.choices import ClaimState, InvoiceType, PhotoType, RegistrationChannel, RegistrationState
from dulux_chatbot.warranty.tests.factories import (
    create_claim,
    create_cs_user,
    create_image,
    create_paint_pair,
    create_registration,
)


class WarrantyRegistrationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cs_user = create_cs_user()
        self.list_url = reverse("registration_list_create")

    def test_registration_list_requires_authentication(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cs_agent_can_list_registrations(self):
        create_registration()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_registration_filter_by_state_and_channel(self):
        create_registration(state=RegistrationState.SUBMITTED, channel=RegistrationChannel.WHATSAPP)
        create_registration(
            phone_number="923009999999", state=RegistrationState.APPROVED, channel=RegistrationChannel.WEB
        )
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(
            self.list_url, {"state": RegistrationState.APPROVED, "channel": RegistrationChannel.WEB}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_registration_search(self):
        registration = create_registration(phone_number="923004444444")
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(self.list_url, {"search": registration.registration_code})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_create_registration_with_paint_pairs(self):
        image = create_image()
        topcoat = create_product(name="API Topcoat")
        basecoat = create_product(name="API Basecoat", product_type="BASECOAT", warranty_years=3)
        self.client.force_authenticate(user=self.cs_user)
        response = self.client.post(
            self.list_url,
            {
                "channel": RegistrationChannel.WEB,
                "customer_name": "Customer Name",
                "phone_number": "923001010101",
                "email": "customer@example.com",
                "city": "Karachi",
                "province": "Sindh",
                "site_address": "123 Street",
                "purchase_date": str(date.today() - timedelta(days=1)),
                "purchase_dealer": "Dealer",
                "purchase_dealer_city": "Karachi",
                "purchase_dealer_address": "Dealer Address",
                "postal_code": "75000",
                "notes": "",
                "paint_pairs": [
                    {
                        "topcoat": topcoat.id,
                        "topcoat_quantity": "10.00",
                        "basecoat": basecoat.id,
                        "basecoat_quantity": "5.00",
                    }
                ],
                "paint_pair_invoices": [{"image_id": image.id, "invoice_type": InvoiceType.TOPCOAT}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_registration_with_future_purchase_date_returns_400(self):
        topcoat = create_product(name="Future Topcoat")
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            self.list_url,
            {
                "channel": RegistrationChannel.WEB,
                "customer_name": "Customer Name",
                "phone_number": "923007777777",
                "email": "customer@example.com",
                "city": "Karachi",
                "province": "Sindh",
                "site_address": "123 Street",
                "purchase_date": str(date.today() + timedelta(days=1)),
                "purchase_dealer": "Dealer",
                "purchase_dealer_city": "Karachi",
                "purchase_dealer_address": "Dealer Address",
                "postal_code": "75000",
                "notes": "",
                "paint_pairs": [
                    {
                        "topcoat": topcoat.id,
                        "topcoat_quantity": "10.00",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("dulux_chatbot.warranty.api.v1.serializers.generate_and_send_certificate.delay")
    def test_registration_transition_approve(self, delay_mock):
        registration = create_registration()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"action": "APPROVE"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        delay_mock.assert_called_once_with(registration.id)

    def test_registration_transition_reject_without_notes_returns_400(self):
        registration = create_registration()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"action": "REJECT"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class WarrantyClaimAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cs_user = create_cs_user()
        self.list_url = reverse("claim_list_create")

    def test_cannot_create_claim_for_non_approved_registration(self):
        registration = create_registration(state=RegistrationState.SUBMITTED)
        paint_pair = create_paint_pair(registration=registration)
        image = create_image()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            self.list_url,
            {
                "registration": registration.id,
                "paint_pair": paint_pair.id,
                "issue_type": "PEELING_CRACKING",
                "affected_area_sqft": "100.00",
                "notes": "",
                "images": [{"image_id": image.id, "photo_type": PhotoType.LONG_SHOT}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_claim_with_less_than_minimum_images_returns_400(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        image = create_image()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            self.list_url,
            {
                "registration": registration.id,
                "paint_pair": paint_pair.id,
                "issue_type": "PEELING_CRACKING",
                "affected_area_sqft": "100.00",
                "notes": "",
                "images": [{"image_id": image.id, "photo_type": PhotoType.LONG_SHOT}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_claim_with_valid_images(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        self.client.force_authenticate(user=self.cs_user)
        images = [create_image(image_name=f"warranty/{index}.jpg") for index in range(3)]

        response = self.client.post(
            self.list_url,
            {
                "registration": registration.id,
                "paint_pair": paint_pair.id,
                "issue_type": "PEELING_CRACKING",
                "affected_area_sqft": "100.00",
                "notes": "",
                "images": [
                    {"image_id": images[0].id, "photo_type": PhotoType.LONG_SHOT},
                    {"image_id": images[1].id, "photo_type": PhotoType.CLOSE_SHOT},
                    {"image_id": images[2].id, "photo_type": PhotoType.ALTERNATE_ANGLE},
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch("dulux_chatbot.warranty.api.v1.serializers.send_whatsapp_status_notification.delay")
    def test_claim_transition_approve(self, delay_mock):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.IN_REVIEW)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("claim_detail", kwargs={"pk": claim.pk}),
            {"action": "APPROVE"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        delay_mock.assert_called_once()

    def test_claim_transition_send_to_qa(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.IN_REVIEW)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("claim_detail", kwargs={"pk": claim.pk}),
            {"action": "QA_REVIEW"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["state"], ClaimState.QA_REVIEW)
