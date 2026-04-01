from constance import config
from rest_framework import serializers

from dulux_chatbot.core.models import Image


class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ("id", "image", "created")

    def validate_image(self, value):
        max_file_size = config.MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024
        if value.size > max_file_size:
            raise serializers.ValidationError(
                f"Image size exceeds the maximum allowed limit of {config.MAX_IMAGE_FILE_SIZE_MB} MB."
            )
        return value
