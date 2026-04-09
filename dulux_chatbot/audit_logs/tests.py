from datetime import date, timedelta

from django.contrib.contenttypes.models import ContentType
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from dulux_chatbot.audit_logs.choices import AuditAction
from dulux_chatbot.audit_logs.models import AuditLog
from dulux_chatbot.products.tests.factories import create_admin_user, create_product, create_product_basecoat
from dulux_chatbot.warranty.choices import RegistrationChannel
from dulux_chatbot.warranty.tests.factories import create_cs_user
from dulux_chatbot.warranty.tests.factories import create_image as create_warranty_image


class AuditLogAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = create_admin_user(email="audit-admin@example.com")
        self.cs_user = create_cs_user(email="audit-cs@example.com")

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
        )
        self.client.force_authenticate(user=self.cs_user)
        forbidden_response = self.client.get(reverse("audit_log_list"))
        self.assertEqual(forbidden_response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse("audit_log_list"), {"model_label": "products.Product"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)
