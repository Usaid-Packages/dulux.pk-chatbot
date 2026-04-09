from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.contenttypes.models import ContentType
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from dulux_chatbot.audit_logs.choices import AuditAction
from dulux_chatbot.audit_logs.models import AuditLog
from dulux_chatbot.complaints.tests.factories import create_complaint
from dulux_chatbot.products.tests.factories import create_admin_user, create_product, create_product_basecoat
from dulux_chatbot.warranty.choices import ClaimState, RegistrationChannel, RegistrationState
from dulux_chatbot.warranty.tests.factories import (
    create_claim,
    create_cs_user,
    create_paint_pair,
    create_quality_user,
    create_registration,
)
from dulux_chatbot.warranty.tests.factories import create_image as create_warranty_image


class AuditLogAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = create_admin_user(email="audit-admin@example.com")
        self.cs_user = create_cs_user(email="audit-cs@example.com")
        self.quality_user = create_quality_user(email="audit-qa@example.com")

    def test_registration_create_writes_audit_log(self):
        image = create_warranty_image()
        topcoat = create_product(name="Audit Topcoat")
        basecoat = create_product(name="Audit Basecoat", product_type="BASECOAT", warranty_years=3)
        create_product_basecoat(topcoat=topcoat, basecoat=basecoat)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            reverse("registration_list_create"),
            {
                "channel": RegistrationChannel.WEB,
                "customer_name": "Audit Customer",
                "phone_number": "923001010101",
                "email": "audit@example.com",
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
                "paint_pair_invoices": [{"image_id": image.id, "invoice_type": "TOPCOAT"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        audit_log = AuditLog.objects.filter(model_label="warranty.WarrantyRegistration").latest("id")
        self.assertEqual(audit_log.action, AuditAction.CREATE)
        self.assertEqual(audit_log.actor, self.cs_user)
        self.assertEqual(audit_log.after_data["customer_name"], "Audit Customer")
        self.assertEqual(audit_log.event_label, "Registration created")

    def test_registration_update_writes_diff(self):
        from dulux_chatbot.warranty.tests.factories import create_registration

        registration = create_registration()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {"notes": "Updated note from CS."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        audit_log = AuditLog.objects.filter(
            model_label="warranty.WarrantyRegistration", action=AuditAction.UPDATE
        ).latest("id")
        self.assertEqual(audit_log.changes["notes"]["after"], "Updated note from CS.")

    def test_registration_resubmit_logs_only_top_level_registration_event(self):
        registration = create_registration(state=RegistrationState.SUBMITTED)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("registration_detail", kwargs={"pk": registration.pk}),
            {
                "action": "RESUBMIT",
                "notes": "Please update the highlighted fields.",
                "rejection_fields": [
                    {"field_name": "email", "note": "Please provide a valid email."},
                    {"field_name": "purchase_dealer_address", "note": "Address is incomplete."},
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            AuditLog.objects.filter(model_label="warranty.RejectionField").count(),
            0,
        )
        audit_log = AuditLog.objects.filter(
            model_label="warranty.WarrantyRegistration",
            action=AuditAction.UPDATE,
        ).latest("id")
        self.assertEqual(audit_log.event_label, "Registration marked for resubmission")
        self.assertEqual(len(audit_log.after_data["rejection_fields"]), 2)

    def test_quality_request_info_logs_top_level_quality_review_and_claim_only(self):
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
        self.assertEqual(AuditLog.objects.filter(model_label="warranty.ClaimQualityReviewItem").count(), 0)
        quality_log = AuditLog.objects.filter(
            model_label="warranty.ClaimQualityReview",
            action=AuditAction.CREATE,
        ).latest("id")
        self.assertEqual(quality_log.event_label, "QA requested more information")
        self.assertEqual(quality_log.after_data["claim"]["registration_code"], registration.registration_code)
        self.assertEqual(len(quality_log.after_data["required_items"]), 2)
        claim_log = AuditLog.objects.filter(
            model_label="warranty.WarrantyClaim",
            action=AuditAction.UPDATE,
        ).latest("id")
        self.assertEqual(claim_log.event_label, "Claim moved to resubmission")
        self.assertEqual(claim_log.after_data["registration"]["registration_code"], registration.registration_code)

    @patch("dulux_chatbot.chatbot.services.whatsapp_client.WhatsAppClient.send_text")
    def test_complaint_message_logs_against_top_level_complaint(self, send_text_mock):
        complaint = create_complaint()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            reverse("complaint_message_list_create", kwargs={"complaint_id": complaint.pk}),
            {"text": "We are looking into this issue."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        send_text_mock.assert_called_once()
        self.assertEqual(AuditLog.objects.filter(model_label="complaints.ChatMessage").count(), 0)
        audit_log = AuditLog.objects.filter(model_label="complaints.Complaint", action=AuditAction.UPDATE).latest("id")
        self.assertEqual(audit_log.event_label, "Complaint message added")
        self.assertEqual(audit_log.changes["latest_message"]["after"]["text"], "We are looking into this issue.")

    def test_product_delete_writes_audit_log(self):
        product = create_product(name="Audit Delete Product")
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.delete(reverse("product_detail", kwargs={"pk": product.pk}))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        audit_log = AuditLog.objects.filter(model_label="products.Product", action=AuditAction.DELETE).latest("id")
        self.assertEqual(audit_log.object_id, str(product.pk))
        self.assertEqual(audit_log.before_data["name"], "Audit Delete Product")

    def test_audit_log_list_is_admin_only_and_supports_filters(self):
        product = create_product(name="Audit Filter Product")
        AuditLog.objects.create(
            actor=self.admin_user,
            actor_email=self.admin_user.email,
            action=AuditAction.CREATE,
            content_type=ContentType.objects.get_for_model(product.__class__),
            object_id=str(product.pk),
            model_label="products.Product",
            object_repr=str(product),
            event_label="Product created",
        )
        self.client.force_authenticate(user=self.cs_user)
        forbidden_response = self.client.get(reverse("audit_log_list"))
        self.assertEqual(forbidden_response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(
            reverse("audit_log_list"), {"search": "Product created", "model_label": "products.Product"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)
        self.assertNotIn("model_label", response.data["results"][0])
        self.assertEqual(response.data["results"][0]["event_label"], "Product created")
