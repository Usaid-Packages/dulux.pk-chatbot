from datetime import date, timedelta
from unittest.mock import patch

from django.core import mail
from django.core.files.base import ContentFile
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from dulux_chatbot.products.tests.factories import create_product, create_product_basecoat
from dulux_chatbot.warranty.choices import ClaimState, InvoiceType, PhotoType, RegistrationChannel, RegistrationState
from dulux_chatbot.warranty.tasks import send_registration_status_notification
from dulux_chatbot.warranty.tests.factories import (
    create_claim,
    create_cs_user,
    create_image,
    create_paint_pair,
    create_registration,
)


def build_notification_template(*, title: str = "Warranty Update") -> str:
    return f"<html><body><h1>{title}</h1><p>Hello Customer Name</p></body></html>"


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
        create_product_basecoat(topcoat=topcoat, basecoat=basecoat)
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

    def test_create_registration_rejects_basecoat_not_linked_to_topcoat(self):
        topcoat = create_product(name="Mapped Topcoat")
        linked_basecoat = create_product(name="Linked Basecoat", product_type="BASECOAT", warranty_years=3)
        invalid_basecoat = create_product(name="Invalid Basecoat", product_type="BASECOAT", warranty_years=3)
        create_product_basecoat(topcoat=topcoat, basecoat=linked_basecoat)
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
                        "basecoat": invalid_basecoat.id,
                        "basecoat_quantity": "5.00",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["paint_pairs"][0]["basecoat"][0],
            "Basecoat must be linked to the selected topcoat product.",
        )

    @patch("dulux_chatbot.warranty.api.v1.serializers.send_registration_status_notification.delay")
    def test_registration_transition_approve(self, delay_mock):
        registration = create_registration()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"action": "APPROVE", "notification_template": build_notification_template(title="Approved")},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        delay_mock.assert_called_once_with(
            registration.id,
            notification_template=build_notification_template(title="Approved"),
        )

    @patch("dulux_chatbot.warranty.api.v1.serializers.send_registration_status_notification.delay")
    def test_registration_transition_reject_triggers_status_notification(self, delay_mock):
        registration = create_registration()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {
                "action": "REJECT",
                "notes": "The uploaded documents do not match the registration details.",
                "notification_template": build_notification_template(title="Rejected"),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        delay_mock.assert_called_once_with(
            registration.id,
            notification_template=build_notification_template(title="Rejected"),
        )

    def test_registration_transition_approve_requires_notification_template(self):
        registration = create_registration()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"action": "APPROVE"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("notification_template", response.data)

    def test_registration_transition_reject_without_notes_returns_400(self):
        registration = create_registration()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"action": "REJECT"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("dulux_chatbot.warranty.api.v1.serializers.send_registration_resubmit_notification.delay")
    def test_registration_transition_resubmit_triggers_notification_task(self, delay_mock):
        registration = create_registration()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {
                "action": "RESUBMIT",
                "notes": "Please update the highlighted fields.",
                "rejection_fields": [{"field_name": "email", "note": "Please provide a valid email."}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        delay_mock.assert_called_once_with(registration.id)

    def test_registration_update_rejects_replacing_claimed_paint_pairs(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        protected_paint_pair = create_paint_pair(registration=registration)
        create_claim(registration=registration, paint_pair=protected_paint_pair, state=ClaimState.SUBMITTED)
        replacement_topcoat = create_product(name="Replacement Topcoat")
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {
                "paint_pairs": [
                    {
                        "topcoat": replacement_topcoat.id,
                        "topcoat_quantity": "12.00",
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["paint_pairs"],
            "Paint pairs cannot be replaced because one or more existing paint pairs are already linked to claims.",
        )

    def test_registration_update_rejects_basecoat_not_linked_to_topcoat(self):
        registration = create_registration()
        topcoat = create_product(name="Update Topcoat")
        linked_basecoat = create_product(name="Update Linked Basecoat", product_type="BASECOAT", warranty_years=3)
        invalid_basecoat = create_product(name="Update Invalid Basecoat", product_type="BASECOAT", warranty_years=3)
        create_product_basecoat(topcoat=topcoat, basecoat=linked_basecoat)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {
                "paint_pairs": [
                    {
                        "topcoat": topcoat.id,
                        "topcoat_quantity": "12.00",
                        "basecoat": invalid_basecoat.id,
                        "basecoat_quantity": "4.00",
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["paint_pairs"][0]["basecoat"][0],
            "Basecoat must be linked to the selected topcoat product.",
        )


class WarrantyClaimAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cs_user = create_cs_user()
        self.list_url = reverse("claim_list_create")

    def test_claim_list_includes_customer_name(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.SUBMITTED)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["customer_name"], registration.customer_name)

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


class WarrantyRegistrationNotificationTaskTests(TestCase):
    @patch("dulux_chatbot.warranty.tasks.WhatsAppClient")
    @patch("dulux_chatbot.warranty.tasks.generate_warranty_certificate")
    def test_send_registration_status_notification_for_approved_registration(self, certificate_mock, client_mock):
        registration = create_registration(state=RegistrationState.APPROVED)
        certificate_mock.return_value = ContentFile(b"approved-pdf", name="approved_certificate.pdf")
        notification_template = build_notification_template(title="Approved From UI")

        send_registration_status_notification(registration.id, notification_template=notification_template)

        registration.refresh_from_db()
        self.assertTrue(bool(registration.warranty_certificate))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [registration.email])
        self.assertEqual(mail.outbox[0].subject, "Your Dulux Assurance Warranty registration has been approved")
        self.assertEqual(len(mail.outbox[0].attachments), 1)
        self.assertEqual(mail.outbox[0].attachments[0][0], "warranty_certificate.pdf")
        self.assertEqual(len(mail.outbox[0].alternatives), 1)
        self.assertIn("Hello Customer Name", mail.outbox[0].alternatives[0][0])

        whatsapp_client = client_mock.return_value
        whatsapp_client.send_text.assert_called_once()
        whatsapp_client.send_document.assert_called_once()
        self.assertEqual(
            whatsapp_client.send_text.call_args.args[1],
            f"Your Warranty registration: {registration.registration_code} is approved.",
        )
        self.assertEqual(whatsapp_client.send_document.call_args.args[2], "warranty_certificate.pdf")

    @patch("dulux_chatbot.warranty.tasks.WhatsAppClient")
    @patch("dulux_chatbot.warranty.tasks.generate_warranty_certificate")
    def test_send_registration_status_notification_for_rejected_registration(self, certificate_mock, client_mock):
        registration = create_registration(state=RegistrationState.REJECTED)
        registration.notes = "The purchase invoice details could not be verified."
        registration.save(update_fields=["notes", "modified"])
        registration.warranty_certificate.save(
            "existing_certificate.pdf",
            ContentFile(b"existing-pdf", name="existing_certificate.pdf"),
            save=True,
        )
        notification_template = build_notification_template(title="Rejected From UI")

        send_registration_status_notification(registration.id, notification_template=notification_template)

        certificate_mock.assert_not_called()
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "Your Dulux Assurance Warranty registration has been rejected")
        self.assertIn("Rejected From UI", mail.outbox[0].body)
        whatsapp_client = client_mock.return_value
        whatsapp_client.send_text.assert_called_once()
        whatsapp_client.send_document.assert_called_once()
        self.assertEqual(
            whatsapp_client.send_text.call_args.args[1],
            f"Your Warranty registration: {registration.registration_code} is rejected.",
        )
