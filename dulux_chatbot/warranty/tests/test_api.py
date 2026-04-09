from datetime import date, timedelta
from unittest.mock import patch

from django.core import mail
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from dulux_chatbot.products.tests.factories import create_product, create_product_basecoat
from dulux_chatbot.warranty.choices import ClaimState, InvoiceType, PhotoType, RegistrationChannel, RegistrationState
from dulux_chatbot.warranty.models import ClaimQualityReview, ClaimQualityReviewItem, ClaimResubmission
from dulux_chatbot.warranty.tasks import send_claim_status_notification, send_registration_status_notification
from dulux_chatbot.warranty.tests.factories import (
    create_admin_user,
    create_claim,
    create_cs_user,
    create_image,
    create_paint_pair,
    create_quality_user,
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
                "required_items": ["ADDITIONAL_PHOTOS_DIFFERENT_ANGLES", "PRODUCT_BATCH_NUMBER_PHOTO"],
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

    def test_claim_list_blocks_duplicate_when_claim_is_in_resubmit(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.RESUBMIT)
        image = create_image()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            self.list_url,
            {
                "registration": registration.id,
                "paint_pair": paint_pair.id,
                "issue_type": claim.issue_type,
                "affected_area_sqft": "100.00",
                "notes": "",
                "images": [{"image_id": image.id, "photo_type": PhotoType.LONG_SHOT}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

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
            required_item="PRODUCT_BATCH_NUMBER_PHOTO",
        )
        ClaimQualityReviewItem.objects.create(
            quality_review=quality_review,
            required_item="ISSUE_TIMELINE_DETAILS",
        )
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(reverse("claim_csr_resubmission", kwargs={"pk": claim.pk}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["claim_id"], claim.id)
        self.assertEqual(response.data["claim_state"], ClaimState.RESUBMIT)
        self.assertEqual(response.data["quality_review_id"], quality_review.id)
        self.assertEqual(len(response.data["requested_items"]), 2)
        self.assertEqual(response.data["requested_items"][0]["required_item"], "PRODUCT_BATCH_NUMBER_PHOTO")
        self.assertEqual(response.data["requested_items"][0]["input_type"], "IMAGE")
        self.assertEqual(response.data["requested_items"][1]["required_item"], "ISSUE_TIMELINE_DETAILS")
        self.assertEqual(response.data["requested_items"][1]["input_type"], "TEXT")

    def test_quality_user_cannot_get_csr_claim_resubmission_fields(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.RESUBMIT)
        self.client.force_authenticate(user=self.quality_user)

        response = self.client.get(reverse("claim_csr_resubmission", kwargs={"pk": claim.pk}))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

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
            required_item="PRODUCT_BATCH_NUMBER_PHOTO",
        )
        ClaimQualityReviewItem.objects.create(
            quality_review=quality_review,
            required_item="ISSUE_TIMELINE_DETAILS",
        )
        image = create_image()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            reverse("claim_csr_resubmission", kwargs={"pk": claim.pk}),
            {
                "notes": "CSR collected all missing information from the customer.",
                "entries": [
                    {
                        "required_item": "PRODUCT_BATCH_NUMBER_PHOTO",
                        "image_id": image.id,
                    },
                    {
                        "required_item": "ISSUE_TIMELINE_DETAILS",
                        "response_text": "The issue first appeared after heavy rain last week.",
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
            required_item="PRODUCT_BATCH_NUMBER_PHOTO",
        )
        ClaimQualityReviewItem.objects.create(
            quality_review=quality_review,
            required_item="ISSUE_TIMELINE_DETAILS",
        )
        image = create_image()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            reverse("claim_csr_resubmission", kwargs={"pk": claim.pk}),
            {
                "entries": [
                    {
                        "required_item": "PRODUCT_BATCH_NUMBER_PHOTO",
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
            required_item="PRODUCT_BATCH_NUMBER_PHOTO",
        )
        image = create_image()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            reverse("claim_csr_resubmission", kwargs={"pk": claim.pk}),
            {
                "entries": [
                    {
                        "required_item": "PRODUCT_BATCH_NUMBER_PHOTO",
                        "image_id": image.id,
                    },
                    {
                        "required_item": "SITE_CONDITIONS_INFO",
                        "response_text": "Sunny weather.",
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
        self.assertEqual(response.data, {"total_registrations": 0, "pending_review": 0, "approved": 0})

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
        self.assertEqual(response.data, {"total_registrations": 1, "pending_review": 0, "approved": 1})

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
                "pending_cs_review": 2,
                "forwarded_to_quality": 2,
                "resolved": 1,
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
                "awaiting_review": 1,
                "info_requested": 1,
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
        self.assertEqual(response.data["detail"], "date_from must be less than or equal to date_to.")


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
        self.assertEqual(whatsapp_client.send_document.call_args.kwargs["caption"], "warranty_certificate.pdf")

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


class WarrantyClaimNotificationTaskTests(TestCase):
    @patch("dulux_chatbot.warranty.tasks.WhatsAppClient")
    def test_send_claim_status_notification_for_approved_claim(self, client_mock):
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

    @patch("dulux_chatbot.warranty.tasks.WhatsAppClient")
    def test_send_claim_status_notification_for_rejected_claim(self, client_mock):
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
