from decouple import config


DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL")

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("BREVO_SMTP_HOST", default="smtp-relay.brevo.com")
EMAIL_PORT = config("BREVO_SMTP_PORT", cast=int, default=587)
EMAIL_HOST_USER = config("BREVO_SMTP_LOGIN")
EMAIL_HOST_PASSWORD = config("BREVO_SMTP_PASSWORD")
EMAIL_USE_TLS = config("BREVO_SMTP_USE_TLS", cast=bool, default=True)
EMAIL_USE_SSL = config("BREVO_SMTP_USE_SSL", cast=bool, default=False)
