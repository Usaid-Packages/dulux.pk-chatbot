from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from dulux_chatbot.complaints.choices import ComplaintStatus
from dulux_chatbot.complaints.tests.factories import create_complaint
from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.tests.factories import create_product, create_surface_type
from dulux_chatbot.users.api.v1.serializers import UserDetailsSerializer
from dulux_chatbot.users.choices import UserRole
from dulux_chatbot.warranty.choices import ClaimState, RegistrationChannel, RegistrationState
from dulux_chatbot.warranty.tests.factories import (
    create_admin_user,
    create_claim,
    create_cs_user,
    create_paint_pair,
    create_quality_user,
    create_registration,
)


User = get_user_model()


class UserModelTests(TestCase):
    def test_create_user_requires_role(self):
        with self.assertRaisesMessage(ValueError, "User role must be set."):
            User.objects.create_user(
                email="customer@example.com",
                password="test-password-123",
            )

    def test_create_superuser_defaults_to_admin_role(self):
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="test-password-123",
        )

        self.assertEqual(user.role, UserRole.ADMIN)


class UserDetailsSerializerTests(TestCase):
    def test_serializer_exposes_role(self):
        user = User.objects.create_user(
            email="agent@example.com",
            password="test-password-123",
            first_name="Case",
            last_name="Agent",
            role=UserRole.CS_AGENT,
        )

        serializer = UserDetailsSerializer(instance=user)

        self.assertEqual(
            serializer.data,
            {
                "id": user.id,
                "email": "agent@example.com",
                "first_name": "Case",
                "last_name": "Agent",
                "role": UserRole.CS_AGENT,
            },
        )


class DashboardAPITests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.cards_url = reverse("dashboard_cards")
        self.analytics_url = reverse("dashboard_analytics")
        self.user = create_admin_user()

    def test_cards_requires_authentication(self):
        response = self.client.get(self.cards_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cards_returns_stable_flow_keys(self):
        create_registration(state=RegistrationState.SUBMITTED)
        registration_approved = create_registration(state=RegistrationState.APPROVED)
        registration_approved.approved_at = timezone.now()
        registration_approved.save(update_fields=["approved_at"])
        create_registration(state=RegistrationState.IN_PROGRESS, channel=RegistrationChannel.WEBFORM)

        claim_registration = create_registration(state=RegistrationState.APPROVED)
        claim_topcoat = create_product(
            name="Dashboard Claim Topcoat", product_type=ProductType.TOPCOAT, warranty_years=5
        )
        claim_basecoat = create_product(
            name="Dashboard Claim Basecoat",
            product_type=ProductType.BASECOAT,
            warranty_years=3,
        )
        create_claim(
            registration=claim_registration,
            paint_pair=create_paint_pair(
                registration=claim_registration,
                topcoat=claim_topcoat,
                basecoat=claim_basecoat,
            ),
            state=ClaimState.SUBMITTED,
        )
        qa_registration = create_registration(state=RegistrationState.APPROVED)
        qa_topcoat = create_product(name="Dashboard QA Topcoat", product_type=ProductType.TOPCOAT, warranty_years=5)
        qa_basecoat = create_product(name="Dashboard QA Basecoat", product_type=ProductType.BASECOAT, warranty_years=3)
        qa_claim = create_claim(
            registration=qa_registration,
            paint_pair=create_paint_pair(
                registration=qa_registration,
                topcoat=qa_topcoat,
                basecoat=qa_basecoat,
            ),
            state=ClaimState.QA_REVIEW,
        )
        qa_claim.modified = timezone.now()
        qa_claim.save(update_fields=["modified"])
        create_complaint(status=ComplaintStatus.OPEN, assigned_to=None)
        create_complaint(status=ComplaintStatus.IN_PROGRESS, assigned_to=self.user)
        create_product()
        create_surface_type()

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.cards_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            set(response.data["flows"].keys()),
            {
                "registrationApprovals",
                "manualRegistration",
                "claimsApprovals",
                "qualityReview",
                "liveChat",
                "productCatalog",
            },
        )
        self.assertEqual(response.data["flows"]["registrationApprovals"]["primaryStat"]["value"], 1)
        self.assertEqual(response.data["flows"]["manualRegistration"]["primaryStat"]["value"], 1)
        self.assertEqual(response.data["flows"]["claimsApprovals"]["primaryStat"]["value"], 1)
        self.assertEqual(response.data["flows"]["qualityReview"]["primaryStat"]["value"], 1)
        self.assertEqual(response.data["flows"]["liveChat"]["primaryStat"]["value"], 1)
        self.assertEqual(response.data["flows"]["productCatalog"]["primaryStat"]["value"], 5)

    def test_analytics_returns_series_with_stable_modules(self):
        today = timezone.localdate()
        registration = create_registration(state=RegistrationState.SUBMITTED)
        registration.created = timezone.now() - timedelta(days=1)
        registration.save(update_fields=["created"])

        approved_registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=approved_registration)
        claim = create_claim(registration=approved_registration, paint_pair=paint_pair, state=ClaimState.IN_REVIEW)
        claim.claim_date = today
        claim.save(update_fields=["claim_date"])

        create_complaint(status=ComplaintStatus.OPEN)
        create_complaint(status=ComplaintStatus.RESOLVED)

        self.client.force_authenticate(user=create_quality_user())
        response = self.client.get(self.analytics_url, {"window_days": 7})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["trendSeries"]), 7)
        self.assertEqual(
            [item["module"] for item in response.data["workloadSeries"]],
            ["Registrations", "Claims", "Quality", "Complaints"],
        )
        self.assertTrue(all(item["pending"] >= 0 for item in response.data["workloadSeries"]))
        self.assertTrue(all(item["inReview"] >= 0 for item in response.data["workloadSeries"]))
        self.assertTrue(all(item["resolved"] >= 0 for item in response.data["workloadSeries"]))

    def test_analytics_rejects_invalid_window_days(self):
        self.client.force_authenticate(user=create_cs_user())

        response = self.client.get(self.analytics_url, {"window_days": 5})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_QUERY_PARAMS")
