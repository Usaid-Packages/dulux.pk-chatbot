from .base import *  # noqa
from .brevo import *  # noqa
from .sentry import *  # noqa


DEBUG = False
ENABLE_DEBUG_TOOLBAR = False

USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
