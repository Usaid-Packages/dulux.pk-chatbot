from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.core import mail
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.test import APIClient

from dulux_chatbot.audit_logs.models import AuditLog
from dulux_chatbot.products.tests.factories import create_product, create_product_basecoat
from dulux_chatbot.warranty.api.v1.serializers import (
    WarrantyClaimListSerializer,
    WarrantyClaimUpdateSerializer,
    WarrantyRegistrationUpdateSerializer,
)
from dulux_chatbot.warranty.choices import ClaimState, InvoiceType, PhotoType, RegistrationChannel, RegistrationState
from dulux_chatbot.warranty.constants import CLAIM_BLOCKING_STATES
from dulux_chatbot.warranty.models import (
    ClaimQualityReview,
    ClaimQualityReviewItem,
    ClaimResubmission,
    ClaimResubmissionEntry,
    WarrantyClaim,
    WarrantyRegistration,
)
from dulux_chatbot.warranty.tasks import send_claim_status_notification, send_registration_status_notification
from dulux_chatbot.warranty.tests.factories import (
    create_admin_user,
    create_claim,
    create_claim_image,
    create_cs_user,
    create_image,
    create_paint_pair,
    create_quality_user,
    create_registration,
)
from dulux_chatbot.warranty.utils.audit import build_claim_snapshot, build_registration_snapshot


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

    def test_registration_list_query_count_stays_constant(self):
        for index in range(3):
            registration = create_registration(phone_number=f"92300444000{index}")
            create_paint_pair(
                registration=registration,
                topcoat=create_product(name=f"Registration List Topcoat {index}", warranty_years=5),
                basecoat=create_product(
                    name=f"Registration List Basecoat {index}",
                    product_type="BASECOAT",
                    warranty_years=3,
                ),
            )
            registration.invoices.create(image=create_image(), invoice_type=InvoiceType.TOPCOAT)
            registration.rejection_fields.create(field_name="email", note="Please update email.")
        self.client.force_authenticate(user=self.cs_user)

        with self.assertNumQueries(2):
            response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)

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

    def test_authenticated_user_can_get_registration_detail(self):
        registration = create_registration()
        rejection_field = registration.rejection_fields.create(
            field_name="email",
            note="Please provide a valid email.",
        )
        self.client.force_authenticate(user=create_quality_user())

        response = self.client.get(reverse("registration_detail", kwargs={"pk": registration.pk}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], registration.id)
        self.assertEqual(
            response.data["rejection_fields"],
            [
                {
                    "id": rejection_field.id,
                    "field_name": "email",
                    "note": "Please provide a valid email.",
                    "created": response.data["rejection_fields"][0]["created"],
                }
            ],
        )

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

    def test_create_registration_rejects_zero_warranty_topcoat(self):
        topcoat = create_product(name="Zero Warranty Topcoat", warranty_years=0)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            self.list_url,
            {
                "channel": RegistrationChannel.WEB,
                "customer_name": "Customer Name",
                "phone_number": "923001010101",
                "email": "customer@example.com",
                "city": "Karachi",
                "site_address": "123 Street",
                "purchase_date": str(date.today() - timedelta(days=1)),
                "purchase_dealer": "Dealer",
                "purchase_dealer_city": "Karachi",
                "purchase_dealer_address": "Dealer Address",
                "postal_code": "75000",
                "notes": "",
                "paint_pairs": [{"topcoat": topcoat.id, "topcoat_quantity": "10.00"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["paint_pairs"][0]["topcoat"][0],
            "Topcoat warranty years must be greater than 0.",
        )

    def test_create_registration_rejects_zero_warranty_basecoat(self):
        topcoat = create_product(name="Warranty Topcoat", warranty_years=5)
        basecoat = create_product(name="Zero Warranty Basecoat", product_type="BASECOAT", warranty_years=0)
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
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["paint_pairs"][0]["basecoat"][0],
            "Basecoat warranty years must be greater than 0.",
        )

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
        self.assertTrue(
            AuditLog.objects.filter(
                object_id=str(registration.id),
                event_label="Registration approved",
                changes__state__after=RegistrationState.APPROVED,
            ).exists()
        )

    def test_registration_invalid_terminal_transitions_return_400(self):
        self.client.force_authenticate(user=self.cs_user)
        for registration_state in (RegistrationState.APPROVED, RegistrationState.REJECTED):
            registration = create_registration(state=registration_state, phone_number=f"92300{registration_state}1")

            response = self.client.patch(
                reverse("registration_detail", kwargs={"pk": registration.pk}),
                {"action": "APPROVE", "notification_template": build_notification_template(title="Approved")},
                format="json",
            )

            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["action"][0],
                f"Cannot transition registration from {registration_state} using APPROVE.",
            )

    @patch("dulux_chatbot.warranty.api.v1.serializers.send_registration_status_notification.delay")
    def test_registration_double_approval_second_attempt_is_rejected(self, delay_mock):
        registration = create_registration()
        self.client.force_authenticate(user=self.cs_user)

        first_response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"action": "APPROVE", "notification_template": build_notification_template(title="Approved")},
            format="json",
        )
        second_response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"action": "APPROVE", "notification_template": build_notification_template(title="Approved Again")},
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        delay_mock.assert_called_once()

    @patch("dulux_chatbot.warranty.api.v1.serializers.send_registration_status_notification.delay")
    def test_stale_registration_approval_is_revalidated_at_save_time(self, delay_mock):
        registration = create_registration()
        first_instance = WarrantyRegistration.objects.get(pk=registration.pk)
        stale_instance = WarrantyRegistration.objects.get(pk=registration.pk)
        request = SimpleNamespace(user=self.cs_user)

        first_serializer = WarrantyRegistrationUpdateSerializer(
            first_instance,
            data={"action": "APPROVE", "notification_template": build_notification_template(title="Approved")},
            partial=True,
            context={"request": request},
        )
        stale_serializer = WarrantyRegistrationUpdateSerializer(
            stale_instance,
            data={"action": "APPROVE", "notification_template": build_notification_template(title="Approved Again")},
            partial=True,
            context={"request": request},
        )

        self.assertTrue(first_serializer.is_valid())
        self.assertTrue(stale_serializer.is_valid())
        first_serializer.save()
        with self.assertRaises(serializers.ValidationError):
            stale_serializer.save()
        delay_mock.assert_called_once()

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

    def test_registration_transition_reject_without_notification_template_returns_400(self):
        registration = create_registration()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"action": "REJECT"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("dulux_chatbot.warranty.api.v1.serializers.send_registration_status_notification.delay")
    def test_registration_transition_reject_allows_empty_notes(self, delay_mock):
        registration = create_registration()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {
                "action": "REJECT",
                "notification_template": build_notification_template(title="Rejected"),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["state"], RegistrationState.REJECTED)
        delay_mock.assert_called_once()

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
        registration = create_registration(state=RegistrationState.RESUBMIT)
        registration.rejection_fields.create(field_name="paint_pairs")
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
        registration = create_registration(state=RegistrationState.RESUBMIT)
        registration.rejection_fields.create(field_name="paint_pairs")
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

    def test_registration_update_allows_any_detail_field_in_resubmit(self):
        registration = create_registration(state=RegistrationState.RESUBMIT)
        registration.rejection_fields.create(field_name="email")
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"city": "Lahore"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["city"], "Lahore")
        self.assertEqual(response.data["state"], RegistrationState.RESUBMIT)
        self.assertTrue(
            AuditLog.objects.filter(
                object_id=str(registration.id),
                event_label="Registration updated",
                changes__city__after="Lahore",
            ).exists()
        )

    def test_registration_update_submits_when_all_rejection_fields_are_updated(self):
        registration = create_registration(state=RegistrationState.RESUBMIT)
        registration.rejection_fields.create(field_name="email")
        registration.rejection_fields.create(field_name="city")
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {
                "email": "updated@example.com",
                "city": "Lahore",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "updated@example.com")
        self.assertEqual(response.data["city"], "Lahore")
        self.assertEqual(response.data["state"], RegistrationState.SUBMITTED)
        registration.refresh_from_db()
        self.assertEqual(registration.rejection_fields.count(), 0)
        self.assertTrue(
            AuditLog.objects.filter(
                object_id=str(registration.id),
                event_label="Registration updated",
                changes__state__after=RegistrationState.SUBMITTED,
                changes__email__after="updated@example.com",
                changes__city__after="Lahore",
            ).exists()
        )

    def test_registration_field_update_terminal_state_returns_400(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"email": "updated@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"][0],
            "Registration fields can only be updated when the registration is in "
            "SUBMITTED, IN_PROGRESS, or RESUBMIT state.",
        )

    def test_registration_field_update_submitted_state_is_allowed(self):
        registration = create_registration(state=RegistrationState.SUBMITTED)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"email": "updated@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "updated@example.com")
        self.assertEqual(response.data["state"], RegistrationState.SUBMITTED)

    def test_registration_field_update_in_progress_state_is_allowed(self):
        registration = create_registration(state=RegistrationState.IN_PROGRESS)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"purchase_dealer_city": "Lahore"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["purchase_dealer_city"], "Lahore")
        self.assertEqual(response.data["state"], RegistrationState.IN_PROGRESS)

    def test_registration_update_rejects_mixing_rejected_fields_with_notes(self):
        registration = create_registration(state=RegistrationState.RESUBMIT)
        registration.rejection_fields.create(field_name="email")
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"email": "updated@example.com", "notes": "Updated note."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"][0],
            "Registration fields must be updated separately from status, notes, or rejection field updates.",
        )


class WarrantyClaimAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cs_user = create_cs_user()
        self.quality_user = create_quality_user()
        self.admin_user = create_admin_user()
        self.list_url = reverse("claim_list_create")

    def test_claim_list_includes_customer_name(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.SUBMITTED)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["customer_name"], registration.customer_name)

    def test_claim_list_query_count_stays_constant(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        for index in range(3):
            topcoat = create_product(name=f"Claim List Topcoat {index}", warranty_years=5)
            basecoat = create_product(name=f"Claim List Basecoat {index}", product_type="BASECOAT", warranty_years=3)
            paint_pair = create_paint_pair(registration=registration, topcoat=topcoat, basecoat=basecoat)
            claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_REVIEW)
            create_claim_image(claim=claim)
            ClaimQualityReview.objects.create(claim=claim, decision_type="QA_APPROVED", notes="")
        self.client.force_authenticate(user=self.cs_user)

        with self.assertNumQueries(5):
            response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)

    def test_claim_list_serializer_uses_prefetched_quality_reviews(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        claims = []
        for index in range(3):
            topcoat = create_product(name=f"Quality Decision Topcoat {index}", warranty_years=5)
            basecoat = create_product(
                name=f"Quality Decision Basecoat {index}",
                product_type="BASECOAT",
                warranty_years=3,
            )
            paint_pair = create_paint_pair(registration=registration, topcoat=topcoat, basecoat=basecoat)
            claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_REVIEW)
            ClaimQualityReview.objects.create(claim=claim, decision_type="QA_APPROVED", notes="")
            claims.append(claim)

        queryset = (
            WarrantyClaim.objects.select_related("registration", "paint_pair__topcoat", "paint_pair__basecoat")
            .prefetch_related("quality_reviews")
            .filter(pk__in=[claim.pk for claim in claims])
        )
        prefetched_claims = list(queryset)

        with self.assertNumQueries(0):
            data = WarrantyClaimListSerializer(prefetched_claims, many=True).data

        self.assertEqual([item["latest_quality_decision"] for item in data], ["QA_APPROVED"] * 3)

    def test_registration_snapshot_uses_prefetched_relations(self):
        registration = create_registration(state=RegistrationState.RESUBMIT)
        create_paint_pair(registration=registration)
        registration.invoices.create(image=create_image(), invoice_type=InvoiceType.TOPCOAT)
        registration.rejection_fields.create(field_name="postal_code", note="Please provide postal code.")

        prefetched_registration = (
            WarrantyRegistration.objects.prefetch_related(
                "paint_pairs__topcoat",
                "paint_pairs__basecoat",
                "invoices__image",
                "rejection_fields",
            )
            .select_related("approved_by")
            .get(pk=registration.pk)
        )

        with self.assertNumQueries(0):
            snapshot = build_registration_snapshot(prefetched_registration)

        self.assertEqual(snapshot["paint_pairs"][0]["topcoat_quantity"], "10.00")
        self.assertEqual(snapshot["paint_pairs"][0]["topcoat"]["name"], "Warranty Topcoat")
        self.assertEqual(snapshot["paint_pairs"][0]["basecoat"]["name"], "Warranty Basecoat")
        self.assertEqual(snapshot["invoice_ids"], [registration.invoices.get().image_id])
        self.assertEqual(snapshot["invoices"][0]["image_id"], registration.invoices.get().image_id)
        self.assertTrue(snapshot["invoices"][0]["image_url"].endswith("/warranty/test.jpg"))
        self.assertEqual(snapshot["rejection_fields"][0]["field_name"], "postal_code")

    def test_claim_snapshot_uses_prefetched_relations(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.RESUBMIT)
        create_claim_image(claim=claim)
        quality_review = ClaimQualityReview.objects.create(claim=claim, decision_type="REQUEST_INFO", notes="")
        ClaimQualityReviewItem.objects.create(quality_review=quality_review, required_item="OTHER")
        resubmission = ClaimResubmission.objects.create(claim=claim, source="WHATSAPP", notes="More details")
        entry_image = create_image(image_name="warranty/resubmit.jpg")
        ClaimResubmissionEntry.objects.create(
            resubmission=resubmission,
            required_item="OTHER",
            response_text="Additional details",
            image=entry_image,
        )

        prefetched_claim = (
            WarrantyClaim.objects.select_related(
                "registration",
                "paint_pair",
                "paint_pair__topcoat",
                "paint_pair__basecoat",
                "paint_pair__registration",
                "approved_by",
            )
            .prefetch_related(
                "images",
                "quality_reviews",
                "resubmissions__entries",
            )
            .get(pk=claim.pk)
        )

        with self.assertNumQueries(0):
            snapshot = build_claim_snapshot(prefetched_claim)

        self.assertEqual(snapshot["images"][0]["photo_type"], PhotoType.LONG_SHOT)
        self.assertEqual(snapshot["quality_review_ids"], [quality_review.id])
        self.assertEqual(snapshot["resubmissions"][0]["entries"][0]["image_id"], entry_image.id)

    def test_claim_list_for_quality_user_only_returns_qa_pipeline_states(self):
        topcoat = create_product(name="Quality List Topcoat", warranty_years=5)
        basecoat = create_product(name="Quality List Basecoat", product_type="BASECOAT", warranty_years=3)
        visible_states = (
            ClaimState.QA_REVIEW,
            ClaimState.RESUBMIT,
            ClaimState.QA_APPROVED,
            ClaimState.QA_REJECTED,
        )
        hidden_states = (
            ClaimState.SUBMITTED,
            ClaimState.IN_REVIEW,
            ClaimState.APPROVED,
            ClaimState.REJECTED,
        )

        for index, claim_state in enumerate(visible_states, start=1):
            registration = create_registration(
                state=RegistrationState.APPROVED,
                phone_number=f"9230000010{index}",
            )
            paint_pair = create_paint_pair(registration=registration, topcoat=topcoat, basecoat=basecoat)
            create_claim(registration=registration, paint_pair=paint_pair, state=claim_state)

        for index, claim_state in enumerate(hidden_states, start=5):
            registration = create_registration(
                state=RegistrationState.APPROVED,
                phone_number=f"9230000010{index}",
            )
            paint_pair = create_paint_pair(registration=registration, topcoat=topcoat, basecoat=basecoat)
            create_claim(registration=registration, paint_pair=paint_pair, state=claim_state)

        self.client.force_authenticate(user=self.quality_user)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], len(visible_states))
        self.assertEqual(
            {item["state"] for item in response.data["results"]},
            set(visible_states),
        )

    def test_quality_user_cannot_create_claim(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        images = [create_image(image_name=f"quality-claim/{index}.jpg") for index in range(3)]
        self.client.force_authenticate(user=self.quality_user)

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

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

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

    def test_create_claim_with_more_than_required_photo_types_returns_400(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        images = [create_image(image_name=f"too-many-claim-photos/{index}.jpg") for index in range(4)]
        self.client.force_authenticate(user=self.cs_user)

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
                    {"image_id": images[3].id, "photo_type": PhotoType.LONG_SHOT},
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["images"][0], "Photo types must be unique.")

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

    def test_create_claim_rejects_zero_warranty_product(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        topcoat = create_product(name="Claim Zero Warranty Topcoat", warranty_years=0)
        paint_pair = create_paint_pair(registration=registration, topcoat=topcoat)
        images = [create_image(image_name=f"claim-zero/{index}.jpg") for index in range(3)]
        self.client.force_authenticate(user=self.cs_user)

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

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["paint_pair"][0], "Claim product warranty years must be greater than 0.")

    def test_claim_transition_approve_requires_qa_approved_state(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.IN_REVIEW)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("claim_detail", kwargs={"pk": claim.pk}),
            {"action": "APPROVE"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_claim_invalid_terminal_transitions_return_400(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        self.client.force_authenticate(user=self.cs_user)
        for index, claim_state in enumerate((ClaimState.APPROVED, ClaimState.REJECTED), start=1):
            paint_pair = create_paint_pair(
                registration=registration,
                topcoat=create_product(name=f"Terminal Topcoat {index}", warranty_years=5),
                basecoat=create_product(
                    name=f"Terminal Basecoat {index}",
                    product_type="BASECOAT",
                    warranty_years=3,
                ),
            )
            claim = create_claim(registration=registration, paint_pair=paint_pair, state=claim_state)

            response = self.client.patch(
                reverse("claim_detail", kwargs={"pk": claim.pk}),
                {
                    "action": "APPROVE",
                    "notification_template": build_notification_template(title="Claim Approved"),
                    "voucher": SimpleUploadedFile("claim-voucher.pdf", b"voucher-pdf", content_type="application/pdf"),
                },
                format="multipart",
            )

            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(response.data["action"][0], f"Cannot transition claim from {claim_state} using APPROVE.")

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

    @patch("dulux_chatbot.warranty.api.v1.serializers.send_claim_resubmit_notification.delay")
    def test_quality_request_info_creates_review_and_moves_claim_to_resubmit(self, delay_mock):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_REVIEW)
        self.client.force_authenticate(user=self.quality_user)

        response = self.client.post(
            reverse("claim_quality_request_info", kwargs={"pk": claim.pk}),
            {
                "required_items": ["ADDITIONAL_PHOTOS_DIFFERENT_ANGLES", "PROOF_OF_PURCHASE_INVOICE"],
                "notes": "Need clearer technical evidence from the site.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["state"], ClaimState.RESUBMIT)
        self.assertEqual(response.data["latest_quality_review"]["decision_type"], "REQUEST_INFO")
        self.assertEqual(len(response.data["latest_quality_review"]["required_items"]), 2)
        delay_mock.assert_called_once_with(claim.id)

    def test_quality_reject_requires_reason_and_notes(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_REVIEW)
        self.client.force_authenticate(user=self.quality_user)

        response = self.client.post(
            reverse("claim_quality_reject", kwargs={"pk": claim.pk}),
            {"technical_notes": "Too short"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_quality_request_info_rejects_removed_required_items(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_REVIEW)
        self.client.force_authenticate(user=self.quality_user)

        response = self.client.post(
            reverse("claim_quality_request_info", kwargs={"pk": claim.pk}),
            {
                "required_items": ["PRODUCT_BATCH_NUMBER_PHOTO"],
                "notes": "Need clearer technical evidence from the site.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("required_items", response.data)

    def test_quality_reject_moves_claim_to_qa_rejected(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_REVIEW)
        self.client.force_authenticate(user=self.quality_user)

        response = self.client.post(
            reverse("claim_quality_reject", kwargs={"pk": claim.pk}),
            {
                "technical_reason": "APPLICATION_ERROR",
                "technical_notes": "Visible roller marks and uneven coat thickness indicate application defect.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["state"], ClaimState.QA_REJECTED)
        self.assertEqual(response.data["latest_quality_review"]["technical_reason"], "APPLICATION_ERROR")

    def test_quality_approve_moves_claim_to_qa_approved(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_REVIEW)
        self.client.force_authenticate(user=self.quality_user)

        response = self.client.post(
            reverse("claim_quality_approve", kwargs={"pk": claim.pk}),
            {"technical_notes": "Evidence is sufficient and the claim is technically valid."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["state"], ClaimState.QA_APPROVED)

    def test_quality_approve_allows_empty_notes(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_REVIEW)
        self.client.force_authenticate(user=self.quality_user)

        response = self.client.post(reverse("claim_quality_approve", kwargs={"pk": claim.pk}), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["state"], ClaimState.QA_APPROVED)

    @patch("dulux_chatbot.warranty.api.v1.serializers.send_claim_status_notification.delay")
    def test_final_approve_uses_claim_patch_from_qa_approved_state(self, delay_mock):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_APPROVED)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("claim_detail", kwargs={"pk": claim.pk}),
            {
                "action": "APPROVE",
                "notes": "Approved by CS after QA clearance.",
                "notification_template": build_notification_template(title="Claim Approved"),
                "voucher": SimpleUploadedFile("claim-voucher.pdf", b"voucher-pdf", content_type="application/pdf"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["state"], ClaimState.APPROVED)
        delay_mock.assert_called_once_with(
            claim.id, notification_template=build_notification_template(title="Claim Approved")
        )
        self.assertTrue(
            AuditLog.objects.filter(
                object_id=str(claim.id),
                event_label="Claim approved",
                changes__state__after=ClaimState.APPROVED,
            ).exists()
        )

    @patch("dulux_chatbot.warranty.api.v1.serializers.send_claim_status_notification.delay")
    def test_claim_double_final_approval_second_attempt_is_rejected(self, delay_mock):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_APPROVED)
        self.client.force_authenticate(user=self.cs_user)

        first_response = self.client.patch(
            reverse("claim_detail", kwargs={"pk": claim.pk}),
            {
                "action": "APPROVE",
                "notification_template": build_notification_template(title="Claim Approved"),
                "voucher": SimpleUploadedFile("claim-voucher.pdf", b"voucher-pdf", content_type="application/pdf"),
            },
            format="multipart",
        )
        second_response = self.client.patch(
            reverse("claim_detail", kwargs={"pk": claim.pk}),
            {
                "action": "APPROVE",
                "notification_template": build_notification_template(title="Claim Approved Again"),
                "voucher": SimpleUploadedFile("claim-voucher-2.pdf", b"voucher-pdf", content_type="application/pdf"),
            },
            format="multipart",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        delay_mock.assert_called_once()

    @patch("dulux_chatbot.warranty.api.v1.serializers.send_claim_status_notification.delay")
    def test_stale_claim_approval_is_revalidated_at_save_time(self, delay_mock):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_APPROVED)
        first_instance = WarrantyClaim.objects.get(pk=claim.pk)
        stale_instance = WarrantyClaim.objects.get(pk=claim.pk)
        request = SimpleNamespace(user=self.cs_user)

        first_serializer = WarrantyClaimUpdateSerializer(
            first_instance,
            data={
                "action": "APPROVE",
                "notification_template": build_notification_template(title="Claim Approved"),
                "voucher": SimpleUploadedFile("claim-voucher.pdf", b"voucher-pdf", content_type="application/pdf"),
            },
            partial=True,
            context={"request": request},
        )
        stale_serializer = WarrantyClaimUpdateSerializer(
            stale_instance,
            data={
                "action": "APPROVE",
                "notification_template": build_notification_template(title="Claim Approved Again"),
                "voucher": SimpleUploadedFile("claim-voucher-2.pdf", b"voucher-pdf", content_type="application/pdf"),
            },
            partial=True,
            context={"request": request},
        )

        self.assertTrue(first_serializer.is_valid())
        self.assertTrue(stale_serializer.is_valid())
        first_serializer.save()
        with self.assertRaises(serializers.ValidationError):
            stale_serializer.save()
        delay_mock.assert_called_once()

    @patch("dulux_chatbot.warranty.api.v1.serializers.send_claim_status_notification.delay")
    def test_final_reject_uses_claim_patch_from_qa_rejected_state(self, delay_mock):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_REJECTED)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("claim_detail", kwargs={"pk": claim.pk}),
            {
                "action": "REJECT",
                "notes": "The claim is outside the warranty scope after QA review.",
                "notification_template": build_notification_template(title="Claim Rejected"),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["state"], ClaimState.REJECTED)
        delay_mock.assert_called_once_with(
            claim.id, notification_template=build_notification_template(title="Claim Rejected")
        )

    @patch("dulux_chatbot.warranty.api.v1.serializers.send_claim_status_notification.delay")
    def test_final_reject_allows_empty_notes(self, delay_mock):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_REJECTED)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("claim_detail", kwargs={"pk": claim.pk}),
            {
                "action": "REJECT",
                "notification_template": build_notification_template(title="Claim Rejected"),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["state"], ClaimState.REJECTED)
        delay_mock.assert_called_once_with(
            claim.id, notification_template=build_notification_template(title="Claim Rejected")
        )

    def test_final_approve_rejects_quality_user(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_APPROVED)
        self.client.force_authenticate(user=self.quality_user)

        response = self.client.patch(
            reverse("claim_detail", kwargs={"pk": claim.pk}),
            {"action": "APPROVE", "notification_template": build_notification_template(title="Claim Approved")},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_final_approve_requires_notification_template(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_APPROVED)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("claim_detail", kwargs={"pk": claim.pk}),
            {"action": "APPROVE"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("notification_template", response.data)

    def test_final_approve_requires_voucher(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_APPROVED)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("claim_detail", kwargs={"pk": claim.pk}),
            {
                "action": "APPROVE",
                "notification_template": build_notification_template(title="Claim Approved"),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("voucher", response.data)

    def test_claim_list_blocks_duplicate_across_all_blocking_states(self):
        self.client.force_authenticate(user=self.cs_user)

        for index, claim_state in enumerate(CLAIM_BLOCKING_STATES, start=1):
            registration = create_registration(
                state=RegistrationState.APPROVED,
                phone_number=f"92300988{index:04d}",
            )
            paint_pair = create_paint_pair(
                registration=registration,
                topcoat=create_product(name=f"Blocking Topcoat {index}", warranty_years=5),
                basecoat=create_product(
                    name=f"Blocking Basecoat {index}",
                    product_type="BASECOAT",
                    warranty_years=3,
                ),
            )
            claim = create_claim(registration=registration, paint_pair=paint_pair, state=claim_state)
            images = [create_image(image_name=f"duplicate-block/{index}-{photo_type}.jpg") for photo_type in range(3)]

            response = self.client.post(
                self.list_url,
                {
                    "registration": registration.id,
                    "paint_pair": paint_pair.id,
                    "issue_type": claim.issue_type,
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

            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, claim_state)

    def test_cs_can_get_requested_claim_resubmission_fields(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.RESUBMIT)
        quality_review = ClaimQualityReview.objects.create(
            claim=claim,
            decision_type="REQUEST_INFO",
            notes="Need clearer proof and timeline details.",
            other_text="Please also mention when the issue first became visible.",
            created_by=self.quality_user,
        )
        ClaimQualityReviewItem.objects.create(
            quality_review=quality_review,
            required_item="PROOF_OF_PURCHASE_INVOICE",
        )
        ClaimQualityReviewItem.objects.create(
            quality_review=quality_review,
            required_item="CLOSE_UP_DAMAGE_PHOTOS",
        )
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(reverse("claim_csr_resubmission", kwargs={"pk": claim.pk}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["claim_id"], claim.id)
        self.assertEqual(response.data["claim_state"], ClaimState.RESUBMIT)
        self.assertEqual(response.data["quality_review_id"], quality_review.id)
        self.assertEqual(len(response.data["requested_items"]), 2)
        self.assertEqual(response.data["requested_items"][0]["required_item"], "PROOF_OF_PURCHASE_INVOICE")
        self.assertEqual(response.data["requested_items"][0]["input_type"], "IMAGE")
        self.assertEqual(response.data["requested_items"][1]["required_item"], "CLOSE_UP_DAMAGE_PHOTOS")
        self.assertEqual(response.data["requested_items"][1]["input_type"], "IMAGE")

    def test_quality_user_cannot_get_csr_claim_resubmission_fields(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.RESUBMIT)
        self.client.force_authenticate(user=self.quality_user)

        response = self.client.get(reverse("claim_csr_resubmission", kwargs={"pk": claim.pk}))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cs_get_csr_claim_resubmission_fields_handles_legacy_removed_items(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.RESUBMIT)
        quality_review = ClaimQualityReview.objects.create(
            claim=claim,
            decision_type="REQUEST_INFO",
            notes="Legacy request from before required-item cleanup.",
            created_by=self.quality_user,
        )
        ClaimQualityReviewItem.objects.create(
            quality_review=quality_review,
            required_item="PRODUCT_BATCH_NUMBER_PHOTO",
        )
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(reverse("claim_csr_resubmission", kwargs={"pk": claim.pk}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["requested_items"][0]["required_item"], "PRODUCT_BATCH_NUMBER_PHOTO")
        self.assertEqual(response.data["requested_items"][0]["label"], "Product Batch Number Photo")
        self.assertEqual(response.data["requested_items"][0]["input_type"], "IMAGE")

    def test_cs_get_csr_claim_resubmission_fields_requires_resubmit_state(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.QA_REVIEW)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(reverse("claim_csr_resubmission", kwargs={"pk": claim.pk}))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Only claims in RESUBMIT can fetch resubmission fields.")

    def test_cs_get_csr_claim_resubmission_fields_requires_request_info_record(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.RESUBMIT)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(reverse("claim_csr_resubmission", kwargs={"pk": claim.pk}))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "No QA request-info record exists for this claim.")

    def test_cs_can_submit_claim_resubmission_details_for_all_requested_items(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.RESUBMIT)
        quality_review = ClaimQualityReview.objects.create(
            claim=claim,
            decision_type="REQUEST_INFO",
            notes="Need more evidence from the customer.",
            created_by=self.quality_user,
        )
        ClaimQualityReviewItem.objects.create(
            quality_review=quality_review,
            required_item="PROOF_OF_PURCHASE_INVOICE",
        )
        ClaimQualityReviewItem.objects.create(
            quality_review=quality_review,
            required_item="CLOSE_UP_DAMAGE_PHOTOS",
        )
        image = create_image()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            reverse("claim_csr_resubmission", kwargs={"pk": claim.pk}),
            {
                "notes": "CSR collected all missing information from the customer.",
                "entries": [
                    {
                        "required_item": "PROOF_OF_PURCHASE_INVOICE",
                        "image_id": image.id,
                    },
                    {
                        "required_item": "CLOSE_UP_DAMAGE_PHOTOS",
                        "image_id": image.id,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["state"], ClaimState.QA_REVIEW)
        claim.refresh_from_db()
        self.assertEqual(claim.state, ClaimState.QA_REVIEW)
        resubmission = claim.resubmissions.get()
        self.assertEqual(resubmission.source, "COMPLAINT")
        self.assertEqual(resubmission.entries.count(), 2)

    def test_cs_resubmission_requires_all_requested_items(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.RESUBMIT)
        quality_review = ClaimQualityReview.objects.create(
            claim=claim,
            decision_type="REQUEST_INFO",
            notes="Need more evidence from the customer.",
            created_by=self.quality_user,
        )
        ClaimQualityReviewItem.objects.create(
            quality_review=quality_review,
            required_item="PROOF_OF_PURCHASE_INVOICE",
        )
        ClaimQualityReviewItem.objects.create(
            quality_review=quality_review,
            required_item="CLOSE_UP_DAMAGE_PHOTOS",
        )
        image = create_image()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            reverse("claim_csr_resubmission", kwargs={"pk": claim.pk}),
            {
                "entries": [
                    {
                        "required_item": "PROOF_OF_PURCHASE_INVOICE",
                        "image_id": image.id,
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("entries", response.data)

    def test_cs_resubmission_rejects_unrequested_items(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.RESUBMIT)
        quality_review = ClaimQualityReview.objects.create(
            claim=claim,
            decision_type="REQUEST_INFO",
            notes="Need clearer batch and damage evidence.",
            created_by=self.quality_user,
        )
        ClaimQualityReviewItem.objects.create(
            quality_review=quality_review,
            required_item="PROOF_OF_PURCHASE_INVOICE",
        )
        image = create_image()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            reverse("claim_csr_resubmission", kwargs={"pk": claim.pk}),
            {
                "entries": [
                    {
                        "required_item": "PROOF_OF_PURCHASE_INVOICE",
                        "image_id": image.id,
                    },
                    {
                        "required_item": "ADDITIONAL_PHOTOS_DIFFERENT_ANGLES",
                        "image_id": image.id,
                    },
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("entries", response.data)


class WarrantyCardCountAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cs_user = create_cs_user(email="counts-cs@example.com")
        self.quality_user = create_quality_user(email="counts-quality@example.com")
        self.admin_user = create_admin_user(email="counts-admin@example.com")
        self.registration_counts_url = reverse("registration_card_counts")
        self.claim_counts_url = reverse("claim_card_counts")
        self.quality_counts_url = reverse("quality_card_counts")

    def test_registration_card_counts_require_cs_or_admin(self):
        self.client.force_authenticate(user=self.quality_user)

        response = self.client.get(self.registration_counts_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_registration_card_counts_return_zero_values(self):
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(self.registration_counts_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "total_registrations": 0,
                "submitted": 0,
                "in_progress": 0,
                "resubmit": 0,
                "approved": 0,
                "rejected": 0,
            },
        )

    def test_registration_card_counts_support_date_and_agent_filters(self):
        registration_for_user = create_registration(state=RegistrationState.APPROVED)
        registration_for_user.approved_by = self.cs_user
        registration_for_user.save(update_fields=["approved_by"])

        old_registration = create_registration(state=RegistrationState.SUBMITTED, phone_number="923009999998")
        old_registration.created = timezone.now() - timedelta(days=7)
        old_registration.save(update_fields=["created"])

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(
            self.registration_counts_url,
            {
                "date_from": timezone.localdate().isoformat(),
                "date_to": timezone.localdate().isoformat(),
                "agent_id": self.cs_user.id,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "total_registrations": 1,
                "submitted": 0,
                "in_progress": 0,
                "resubmit": 0,
                "approved": 1,
                "rejected": 0,
            },
        )

    def test_claim_card_counts_return_expected_summary(self):
        topcoat = create_product(name="Counts Claim Topcoat", warranty_years=5)
        basecoat = create_product(name="Counts Claim Basecoat", product_type="BASECOAT", warranty_years=3)

        submitted_registration = create_registration(state=RegistrationState.APPROVED, phone_number="923000000001")
        submitted_pair = create_paint_pair(registration=submitted_registration, topcoat=topcoat, basecoat=basecoat)
        create_claim(registration=submitted_registration, paint_pair=submitted_pair, state=ClaimState.SUBMITTED)

        resubmit_registration = create_registration(state=RegistrationState.APPROVED, phone_number="923000000002")
        resubmit_pair = create_paint_pair(registration=resubmit_registration, topcoat=topcoat, basecoat=basecoat)
        create_claim(registration=resubmit_registration, paint_pair=resubmit_pair, state=ClaimState.RESUBMIT)

        qa_review_registration = create_registration(state=RegistrationState.APPROVED, phone_number="923000000003")
        qa_review_pair = create_paint_pair(registration=qa_review_registration, topcoat=topcoat, basecoat=basecoat)
        create_claim(registration=qa_review_registration, paint_pair=qa_review_pair, state=ClaimState.QA_REVIEW)

        qa_approved_registration = create_registration(state=RegistrationState.APPROVED, phone_number="923000000004")
        qa_approved_pair = create_paint_pair(
            registration=qa_approved_registration,
            topcoat=topcoat,
            basecoat=basecoat,
        )
        create_claim(
            registration=qa_approved_registration,
            paint_pair=qa_approved_pair,
            state=ClaimState.QA_APPROVED,
        )

        resolved_registration = create_registration(state=RegistrationState.APPROVED, phone_number="923000000005")
        resolved_pair = create_paint_pair(registration=resolved_registration, topcoat=topcoat, basecoat=basecoat)
        create_claim(registration=resolved_registration, paint_pair=resolved_pair, state=ClaimState.APPROVED)

        self.client.force_authenticate(user=self.cs_user)
        response = self.client.get(self.claim_counts_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "total_claims": 5,
                "submitted": 1,
                "in_review": 0,
                "qa_review": 1,
                "resubmit": 1,
                "qa_approved": 1,
                "qa_rejected": 0,
                "approved": 1,
                "rejected": 0,
            },
        )

    def test_quality_card_counts_require_quality_or_admin(self):
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(self.quality_counts_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_quality_card_counts_return_expected_summary(self):
        topcoat = create_product(name="Counts QA Topcoat", warranty_years=5)
        basecoat = create_product(name="Counts QA Basecoat", product_type="BASECOAT", warranty_years=3)

        awaiting_registration = create_registration(state=RegistrationState.APPROVED, phone_number="923000000006")
        awaiting_pair = create_paint_pair(registration=awaiting_registration, topcoat=topcoat, basecoat=basecoat)
        create_claim(registration=awaiting_registration, paint_pair=awaiting_pair, state=ClaimState.QA_REVIEW)

        info_requested_registration = create_registration(state=RegistrationState.APPROVED, phone_number="923000000007")
        info_requested_pair = create_paint_pair(
            registration=info_requested_registration,
            topcoat=topcoat,
            basecoat=basecoat,
        )
        create_claim(
            registration=info_requested_registration,
            paint_pair=info_requested_pair,
            state=ClaimState.RESUBMIT,
        )

        resolved_registration = create_registration(state=RegistrationState.APPROVED, phone_number="923000000008")
        resolved_pair = create_paint_pair(registration=resolved_registration, topcoat=topcoat, basecoat=basecoat)
        resolved_claim = create_claim(
            registration=resolved_registration,
            paint_pair=resolved_pair,
            state=ClaimState.QA_REJECTED,
        )
        resolved_claim.modified = timezone.now()
        resolved_claim.save(update_fields=["modified"])

        self.client.force_authenticate(user=self.quality_user)
        response = self.client.get(self.quality_counts_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "total_in_queue": 3,
                "qa_review": 1,
                "resubmit": 1,
                "qa_approved": 0,
                "qa_rejected": 1,
                "resolved_today": 1,
            },
        )

    def test_card_count_endpoints_reject_invalid_date_range(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            self.registration_counts_url,
            {"date_from": "2026-04-10", "date_to": "2026-04-01"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["non_field_errors"][0], "date_from must be less than or equal to date_to.")


class ClaimResubmissionSerializerTests(TestCase):
    def test_claim_detail_returns_latest_resubmission(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.RESUBMIT)
        ClaimResubmission.objects.create(claim=claim, source="WHATSAPP", notes="Customer sent more photos.")
        client = APIClient()
        client.force_authenticate(user=create_cs_user(email="cs-detail@example.com"))

        response = client.get(reverse("claim_detail", kwargs={"pk": claim.pk}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["latest_resubmission"]["notes"], "Customer sent more photos.")


class WarrantyRegistrationNotificationTaskTests(TestCase):
    @patch("dulux_chatbot.warranty.tasks.send_whatsapp_main_menu.apply_async")
    @patch("dulux_chatbot.warranty.tasks.WhatsAppClient")
    @patch("dulux_chatbot.warranty.tasks.generate_warranty_certificate")
    def test_send_registration_status_notification_for_approved_registration(
        self,
        certificate_mock,
        client_mock,
        delayed_menu_mock,
    ):
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
        self.assertEqual(whatsapp_client.send_document.call_args.kwargs["caption"], "warranty_certificate.pdf")
        delayed_menu_mock.assert_called_once()
        self.assertEqual(delayed_menu_mock.call_args.kwargs["countdown"], 2)
        self.assertEqual(delayed_menu_mock.call_args.kwargs["args"][0], registration.phone_number)

    @patch("dulux_chatbot.warranty.tasks.send_whatsapp_main_menu.apply_async")
    @patch("dulux_chatbot.warranty.tasks.WhatsAppClient")
    @patch("dulux_chatbot.warranty.tasks.generate_warranty_certificate")
    def test_send_registration_status_notification_logs_certificate_generation_failure(
        self,
        certificate_mock,
        client_mock,
        delayed_menu_mock,
    ):
        registration = create_registration(state=RegistrationState.APPROVED)
        certificate_mock.side_effect = Exception("pdf failed")
        notification_template = build_notification_template(title="Approved From UI")

        send_registration_status_notification(registration.id, notification_template=notification_template)

        registration.refresh_from_db()
        self.assertFalse(bool(registration.warranty_certificate))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(len(mail.outbox[0].attachments), 0)
        whatsapp_client = client_mock.return_value
        whatsapp_client.send_text.assert_called_once()
        whatsapp_client.send_document.assert_not_called()
        delayed_menu_mock.assert_called_once()

    @patch("dulux_chatbot.warranty.tasks.send_whatsapp_main_menu.apply_async")
    @patch("dulux_chatbot.warranty.tasks.WhatsAppClient")
    @patch("dulux_chatbot.warranty.tasks.generate_warranty_certificate")
    def test_send_registration_status_notification_for_rejected_registration(
        self,
        certificate_mock,
        client_mock,
        delayed_menu_mock,
    ):
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
        self.assertEqual(len(mail.outbox[0].attachments), 0)
        whatsapp_client = client_mock.return_value
        whatsapp_client.send_text.assert_called_once()
        whatsapp_client.send_document.assert_not_called()
        self.assertEqual(
            whatsapp_client.send_text.call_args.args[1],
            f"Your Warranty registration: {registration.registration_code} is rejected.",
        )
        delayed_menu_mock.assert_called_once()
        self.assertEqual(delayed_menu_mock.call_args.kwargs["countdown"], 2)
        self.assertEqual(delayed_menu_mock.call_args.kwargs["args"][0], registration.phone_number)

    def test_send_registration_status_notification_email_failure_still_sends_whatsapp(self):
        registration = create_registration(state=RegistrationState.REJECTED)
        notification_template = build_notification_template(title="Rejected From UI")

        with (
            patch("dulux_chatbot.warranty.tasks.EmailMultiAlternatives.send", side_effect=Exception("smtp down")),
            patch("dulux_chatbot.warranty.tasks.WhatsAppClient") as client_mock,
            patch("dulux_chatbot.warranty.tasks.send_whatsapp_main_menu.apply_async") as delayed_menu_mock,
        ):
            send_registration_status_notification(registration.id, notification_template=notification_template)

        whatsapp_client = client_mock.return_value
        whatsapp_client.send_text.assert_called_once()
        whatsapp_client.send_document.assert_not_called()
        delayed_menu_mock.assert_called_once()


class WarrantyClaimNotificationTaskTests(TestCase):
    @patch("dulux_chatbot.warranty.tasks.send_whatsapp_main_menu.apply_async")
    @patch("dulux_chatbot.warranty.tasks.WhatsAppClient")
    def test_send_claim_status_notification_for_approved_claim(self, client_mock, delayed_menu_mock):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.APPROVED)
        claim.voucher.save("claim_voucher.pdf", ContentFile(b"voucher-pdf", name="claim_voucher.pdf"), save=True)
        notification_template = build_notification_template(title="Claim Approved")

        send_claim_status_notification(claim.id, notification_template=notification_template)

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [registration.email])
        self.assertEqual(mail.outbox[0].subject, "Your Dulux Assurance claim has been approved")
        self.assertEqual(len(mail.outbox[0].attachments), 1)
        whatsapp_client = client_mock.return_value
        whatsapp_client.send_text.assert_called_once()
        whatsapp_client.send_document.assert_called_once()
        self.assertEqual(
            whatsapp_client.send_text.call_args.args[1],
            f"Your claim for registration: {registration.registration_code} is approved.",
        )
        self.assertEqual(whatsapp_client.send_document.call_args.kwargs["caption"], "claim_voucher.pdf")
        delayed_menu_mock.assert_called_once()
        self.assertEqual(delayed_menu_mock.call_args.kwargs["countdown"], 2)
        self.assertEqual(delayed_menu_mock.call_args.kwargs["args"][0], registration.phone_number)

    @patch("dulux_chatbot.warranty.tasks.send_whatsapp_main_menu.apply_async")
    @patch("dulux_chatbot.warranty.tasks.WhatsAppClient")
    def test_send_claim_status_notification_for_rejected_claim(self, client_mock, delayed_menu_mock):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.REJECTED)
        notification_template = build_notification_template(title="Claim Rejected")

        send_claim_status_notification(claim.id, notification_template=notification_template)

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "Your Dulux Assurance claim has been rejected")
        whatsapp_client = client_mock.return_value
        whatsapp_client.send_text.assert_called_once()
        whatsapp_client.send_document.assert_not_called()
        self.assertEqual(
            whatsapp_client.send_text.call_args.args[1],
            f"Your claim for registration: {registration.registration_code} is rejected.",
        )
        delayed_menu_mock.assert_called_once()
        self.assertEqual(delayed_menu_mock.call_args.kwargs["countdown"], 2)
        self.assertEqual(delayed_menu_mock.call_args.kwargs["args"][0], registration.phone_number)

    def test_send_claim_status_notification_email_failure_still_sends_whatsapp(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.REJECTED)
        notification_template = build_notification_template(title="Claim Rejected")

        with (
            patch("dulux_chatbot.warranty.tasks.EmailMultiAlternatives.send", side_effect=Exception("smtp down")),
            patch("dulux_chatbot.warranty.tasks.WhatsAppClient") as client_mock,
            patch("dulux_chatbot.warranty.tasks.send_whatsapp_main_menu.apply_async") as delayed_menu_mock,
        ):
            send_claim_status_notification(claim.id, notification_template=notification_template)

        whatsapp_client = client_mock.return_value
        whatsapp_client.send_text.assert_called_once()
        whatsapp_client.send_document.assert_not_called()
        delayed_menu_mock.assert_called_once()
