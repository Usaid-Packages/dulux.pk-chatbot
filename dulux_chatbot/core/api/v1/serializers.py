from rest_framework import serializers

from dulux_chatbot.core.models import Image


class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ("id", "image", "created")
