from datetime import timedelta
from pathlib import Path

from decouple import Csv, config


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config("DJANGO_SECRET_KEY")

ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", cast=Csv())
CSRF_TRUSTED_ORIGINS = config("DJANGO_CSRF_TRUSTED_ORIGINS", cast=Csv())

# Application definition

DEFAULT_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "daphne",
    "django.contrib.staticfiles",
    "django.contrib.sites",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "dj_rest_auth",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "dj_rest_auth.registration",
    "django_celery_beat",
    "django_celery_results",
    "drf_yasg",
    "corsheaders",
    "constance",
    "django_extensions",
    "django_filters",
    "health_check",
    "health_check.db",
    "health_check.cache",
    "health_check.contrib.migrations",
    "health_check.contrib.celery",
    "health_check.contrib.celery_ping",
    "health_check.contrib.redis",
]

CUSTOM_APPS = [
    "dulux_chatbot.core",
    "dulux_chatbot.audit_logs",
    "dulux_chatbot.users",
    "dulux_chatbot.products",
    "dulux_chatbot.warranty",
    "dulux_chatbot.complaints",
    "dulux_chatbot.chatbot",
]

INSTALLED_APPS = DEFAULT_APPS + THIRD_PARTY_APPS + CUSTOM_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "dulux_chatbot.core.middleware.logging.LoggingMiddleware",
]

ROOT_URLCONF = "config.urls"

AUTH_USER_MODEL = "users.User"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "dulux_chatbot/templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database
# https://docs.djangoproject.com/en/3.2/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": config("DB_ENGINE"),
        "NAME": config("DB_NAME"),
        "USER": config("DB_USER"),
        "PASSWORD": config("DB_PASSWORD"),
        "HOST": config("DB_HOST"),
        "PORT": config("DB_PORT"),
    }
}

# Password validation
# https://docs.djangoproject.com/en/3.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "dulux_chatbot.users.password_validation.PasswordValidator",
    },
]

# Internationalization
# https://docs.djangoproject.com/en/3.2/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_L10N = True

USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.2/howto/static-files/

STATIC_URL = "/django-static/"
STATIC_ROOT = "/code/static"
STATICFILES_DIRS = []
MEDIA_ROOT = "/code/media"
MEDIA_URL = "/django-media/"

# Default primary key field type
# https://docs.djangoproject.com/en/3.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": True,
    "formatters": {
        "simple": {
            "format": "{asctime} {levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "file": {
            "level": "INFO",
            "class": "dulux_chatbot.core.logging.handler.LoggingHandler",
            "filename": BASE_DIR / "debug.log",
            "formatter": "simple",
            "backupCount": 10,
            "maxBytes": 1 * 1024 * 1024,  # 1 MB
        },
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "loggers": {
        "django.request": {
            "handlers": [
                "file",
                "console",
            ],
            "level": "ERROR",
            "propagate": False,
        },
        "dulux_chatbot": {
            "handlers": [
                "file",
                "console",
            ],
            "level": "INFO",
        },
    },
}

REDIS_URL = config("REDIS_URL")

WHATSAPP_ACCESS_TOKEN = config("WHATSAPP_ACCESS_TOKEN")
WHATSAPP_PHONE_NUMBER_ID = config("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_VERIFY_TOKEN = config("WHATSAPP_VERIFY_TOKEN")
WHATSAPP_BUSINESS_ACCOUNT_ID = config("WHATSAPP_BUSINESS_ACCOUNT_ID")

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = "django-db"
CELERY_ACCEPT_CONTENT = [
    "application/json",
]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": f"{REDIS_URL}/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}

# TODO(audit F-10 Critical): Redis hostname hardcoded as "redis" instead of
# using REDIS_URL (which is already loaded from env). In staging/prod with a
# managed Redis (ElastiCache, different hostname), WebSockets silently fail.
# Parse REDIS_URL: from urllib.parse import urlparse; _r = urlparse(REDIS_URL);
# then use (_r.hostname, _r.port or 6379) in the hosts list.
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [("redis", 6379)]},
    }
}

CORS_ALLOW_ALL_ORIGINS = True

CONSTANCE_BACKEND = "constance.backends.redisd.RedisBackend"
CONSTANCE_REDIS_CONNECTION = f"{REDIS_URL}/0"
CONSTANCE_REDIS_PREFIX = "constance:dulux_chatbot:"

SWAGGER_SETTINGS = {
    "SECURITY_DEFINITIONS": {"api_key": {"type": "apiKey", "in": "header", "name": "Authorization"}},
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "dulux_chatbot.core.paginations.PageNumberPagination",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(seconds=int(config("ACCESS_TOKEN_LIFETIME_IN_SECS", cast=int))),
    "REFRESH_TOKEN_LIFETIME": timedelta(seconds=int(config("REFRESH_TOKEN_LIFETIME_IN_SECS", cast=int))),
}

SITE_ID = 1

REST_AUTH = {
    "USER_DETAILS_SERIALIZER": "dulux_chatbot.users.api.v1.serializers.UserDetailsSerializer",
    "TOKEN_MODEL": None,
    "USE_JWT": True,
    "JWT_AUTH_HTTPONLY": False,
}

ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_EMAIL_SUBJECT_PREFIX = "[Dulux Assurance] "

from .constance import *  # noqa
