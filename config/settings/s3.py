from decouple import config


"""
DigitalOcean Spaces (S3-compatible) storage settings.

We keep the standard `django-storages` setting names (AWS_*) so the S3 backend
works without customization, but we also accept Spaces-style env vars.

Supported env vars (preferred):
- DIGITALOCEAN_SPACES_ACCESS_KEY
- DIGITALOCEAN_SPACES_SECRET_KEY
- DIGITALOCEAN_SPACES_REGION (e.g. "nyc3", "sgp1")
- DIGITALOCEAN_SPACES_BUCKET_NAME
- DIGITALOCEAN_SPACES_ENDPOINT_URL (optional; default derived from region)
- DIGITALOCEAN_SPACES_CUSTOM_DOMAIN (optional; e.g. CDN domain or "{bucket}.{region}.digitaloceanspaces.com")

Backwards compatible env vars (legacy):
- SPACES_ACCESS_KEY / SPACES_SECRET_KEY / SPACES_REGION / SPACES_BUCKET_NAME / SPACES_ENDPOINT_URL / SPACES_CUSTOM_DOMAIN
- AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_ACCESS_KEY_ID / AWS_S3_SECRET_ACCESS_KEY
- AWS_S3_REGION_NAME / AWS_STORAGE_BUCKET_NAME / AWS_S3_ENDPOINT_URL / AWS_S3_CUSTOM_DOMAIN
"""

AWS_ACCESS_KEY_ID = config(
    "DIGITALOCEAN_SPACES_ACCESS_KEY",
    default=config(
        "SPACES_ACCESS_KEY", default=config("AWS_ACCESS_KEY_ID", default=config("AWS_S3_ACCESS_KEY_ID", default=""))
    ),
)
AWS_SECRET_ACCESS_KEY = config(
    "DIGITALOCEAN_SPACES_SECRET_KEY",
    default=config(
        "SPACES_SECRET_KEY",
        default=config("AWS_SECRET_ACCESS_KEY", default=config("AWS_S3_SECRET_ACCESS_KEY", default="")),
    ),
)

AWS_S3_REGION_NAME = config(
    "DIGITALOCEAN_SPACES_REGION",
    default=config("SPACES_REGION", default=config("AWS_S3_REGION_NAME", default="")),
)
AWS_STORAGE_BUCKET_NAME = config(
    "DIGITALOCEAN_SPACES_BUCKET_NAME",
    default=config("SPACES_BUCKET_NAME", default=config("AWS_STORAGE_BUCKET_NAME", default="")),
)

AWS_S3_ENDPOINT_URL = config(
    "DIGITALOCEAN_SPACES_ENDPOINT_URL",
    default=config(
        "SPACES_ENDPOINT_URL",
        "AWS_S3_ENDPOINT_URL",
        default=(f"https://{AWS_S3_REGION_NAME}.digitaloceanspaces.com" if AWS_S3_REGION_NAME else ""),
    ),
)
AWS_S3_CUSTOM_DOMAIN = config(
    "DIGITALOCEAN_SPACES_CUSTOM_DOMAIN",
    default=config(
        "SPACES_CUSTOM_DOMAIN",
        "AWS_S3_CUSTOM_DOMAIN",
        default=(
            f"{AWS_STORAGE_BUCKET_NAME}.{AWS_S3_REGION_NAME}.digitaloceanspaces.com"
            if AWS_STORAGE_BUCKET_NAME and AWS_S3_REGION_NAME
            else ""
        ),
    ),
)
AWS_S3_OBJECT_PARAMETERS = {
    "CacheControl": "max-age=86400",
}

AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_S3_ADDRESSING_STYLE = "virtual"
AWS_STATIC_LOCATION = "static"
AWS_MEDIA_LOCATION = "media"

STATICFILES_STORAGE = "dulux_chatbot.core.storage_backends.StaticStorage"
DEFAULT_FILE_STORAGE = "dulux_chatbot.core.storage_backends.MediaStorage"
