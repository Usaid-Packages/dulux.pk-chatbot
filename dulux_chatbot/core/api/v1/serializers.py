from constance import config
from rest_framework import serializers

from dulux_chatbot.core.models import Image


class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ("id", "image", "created")

    # TODO(audit SEC-03 Medium): Missing file content-type validation on image upload.
    # Only file size is checked. A malicious user can upload executable files (.html, .svg
    # with JS, .php) with an image extension. Validate the MIME type against an allowlist
    # (image/jpeg, image/png, image/webp) by reading file magic bytes, not just the
    # Content-Type header. Also consider sanitizing filenames to prevent path traversal.
    def validate_image(self, value):
        max_file_size = config.MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024
        if value.size > max_file_size:
            raise serializers.ValidationError(
                f"Image size exceeds the maximum allowed limit of {config.MAX_IMAGE_FILE_SIZE_MB} MB."
            )
        return value
