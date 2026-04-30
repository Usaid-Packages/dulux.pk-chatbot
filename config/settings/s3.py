from decouple import config


"""
DigitalOcean Spaces (S3-compatible) storage settings.

We keep the standard `django-storages` Django setting names (AWS_*) so the S3 backend
works without customization, but we ONLY read DigitalOcean env vars (DIGITALOCEAN_SPACES_*).

Supported env vars (preferred):
- DIGITALOCEAN_SPACES_ACCESS_KEY
- DIGITALOCEAN_SPACES_SECRET_KEY
- DIGITALOCEAN_SPACES_REGION (e.g. "nyc3", "sgp1")
- DIGITALOCEAN_SPACES_BUCKET_NAME
- DIGITALOCEAN_SPACES_ENDPOINT_URL (optional; default derived from region)
- DIGITALOCEAN_SPACES_CUSTOM_DOMAIN (optional; e.g. CDN domain or "{bucket}.{region}.digitaloceanspaces.com")
"""

AWS_ACCESS_KEY_ID = config("DIGITALOCEAN_SPACES_ACCESS_KEY")
AWS_SECRET_ACCESS_KEY = config("DIGITALOCEAN_SPACES_SECRET_KEY")

AWS_S3_REGION_NAME = config("DIGITALOCEAN_SPACES_REGION")
AWS_STORAGE_BUCKET_NAME = config("DIGITALOCEAN_SPACES_BUCKET_NAME")

AWS_S3_ENDPOINT_URL = config(
    "DIGITALOCEAN_SPACES_ENDPOINT_URL",
    default=f"https://{AWS_S3_REGION_NAME}.digitaloceanspaces.com",
)
AWS_S3_CUSTOM_DOMAIN = config(
    "DIGITALOCEAN_SPACES_CUSTOM_DOMAIN",
    default=f"{AWS_STORAGE_BUCKET_NAME}.{AWS_S3_REGION_NAME}.digitaloceanspaces.com",
)
AWS_S3_OBJECT_PARAMETERS = {
    "CacheControl": "max-age=86400",
}

AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_S3_ADDRESSING_STYLE = "virtual"
AWS_STATIC_LOCATION = "static"
AWS_MEDIA_LOCATION = "media"

# Django 4.2+: Use STORAGES (do not set DEFAULT_FILE_STORAGE/STATICFILES_STORAGE).
# Those legacy settings are mutually exclusive with STORAGES.
STORAGES = {
    "default": {"BACKEND": "dulux_chatbot.core.storage_backends.MediaStorage"},
    "staticfiles": {"BACKEND": "dulux_chatbot.core.storage_backends.StaticStorage"},
}
