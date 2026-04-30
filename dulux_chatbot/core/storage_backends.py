from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class StaticStorage(S3Boto3Storage):
    location = settings.AWS_STATIC_LOCATION
    default_acl = "public-read"
    # Static assets should have stable, unsigned URLs.
    custom_domain = getattr(settings, "AWS_S3_CUSTOM_DOMAIN", None) or None
    querystring_auth = False


class MediaStorage(S3Boto3Storage):
    location = settings.AWS_MEDIA_LOCATION
    default_acl = "private"
    file_overwrite = False
    # Private media uses signed URLs (required for WhatsApp/FE access).
    custom_domain = getattr(settings, "AWS_S3_CUSTOM_DOMAIN", None) or None
    querystring_auth = True
