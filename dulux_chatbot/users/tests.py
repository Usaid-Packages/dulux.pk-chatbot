from django.contrib.auth import get_user_model
from django.test import TestCase

from dulux_chatbot.users.api.v1.serializers import UserDetailsSerializer
from dulux_chatbot.users.choices import UserRole


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
