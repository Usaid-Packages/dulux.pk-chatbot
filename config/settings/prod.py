from .base import *  # noqa
from .brevo import *  # noqa
from .sentry import *  # noqa


# TODO(audit SEC-02 High): Missing SECURE_PROXY_SSL_HEADER in prod settings.
# Stage has it but prod does not. Without this, Django cannot detect HTTPS behind
# Nginx, causing CSRF failures and insecure redirect loops. Add:
# SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# Also missing: SECURE_HSTS_SECONDS, SECURE_SSL_REDIRECT, SESSION_COOKIE_SECURE,
# CSRF_COOKIE_SECURE — all recommended for production behind TLS.
DEBUG = False
ENABLE_DEBUG_TOOLBAR = False

INSTALLED_APPS += [  # noqa
    "storages",
    "health_check.storage",
    "health_check.contrib.s3boto3_storage",
]

STATIC_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/{AWS_STATIC_LOCATION}/"  # noqa
MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/{AWS_MEDIA_LOCATION}/"  # noqa
