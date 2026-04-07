from rest_framework import serializers

from dulux_chatbot.users.models import User


class UserDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role")
        read_only_fields = fields


class DashboardCardsQuerySerializer(serializers.Serializer):
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        date_from = attrs.get("date_from")
        date_to = attrs.get("date_to")
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError("date_from must be less than or equal to date_to.")
        return attrs


class DashboardAnalyticsQuerySerializer(serializers.Serializer):
    WINDOW_CHOICES = (7, 14, 30)

    window_days = serializers.IntegerField(required=False, default=7)

    def validate_window_days(self, value: int) -> int:
        if value not in self.WINDOW_CHOICES:
            raise serializers.ValidationError("window_days must be one of 7, 14, or 30.")
        return value
