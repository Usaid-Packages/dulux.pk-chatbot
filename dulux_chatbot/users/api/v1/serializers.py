from dj_rest_auth.serializers import (
    UserDetailsSerializer as DJRestAuthUserDetailsSerializer,
)


class UserDetailsSerializer(DJRestAuthUserDetailsSerializer):
    class Meta(DJRestAuthUserDetailsSerializer.Meta):
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
        )
