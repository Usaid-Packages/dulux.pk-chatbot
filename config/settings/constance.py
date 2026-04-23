CONSTANCE_CONFIG = {
    "MAX_LOG_BODY_CHARS_LIMIT": (2048, "Maximum body size limit to keep for the logfile."),
    "MAX_OTP_RETRIES": (3, "Maximum OTP verification attempts"),
    "OTP_CODE_LENGTH": (6, "Length of OTP code"),
    "WHATSAPP_API_BASE_URL": ("https://graph.facebook.com/v20.0", "WhatsApp Graph API base URL"),
    "WHATSAPP_API_TIMEOUT_SECS": (10, "WhatsApp API request timeout in seconds"),
    "IMPORT_CHUNK_SIZE": (100, "Rows per DB transaction in bulk imports"),
    "MAX_IMPORT_FILE_SIZE_MB": (10, "Maximum import file size in MB"),
    "MAX_IMAGE_FILE_SIZE_MB": (10, "Maximum uploaded image size in MB"),
    "MIN_CLAIM_PHOTOS": (3, "Minimum photos required per warranty claim"),
    "OTP_EXPIRY_MINUTES": (5, "Minutes before a WhatsApp OTP expires"),
    "WHATSAPP_SESSION_TIMEOUT_MINUTES": (
        5,
        "Minutes before an inactive WhatsApp chatbot session resets to the main menu",
    ),
    "WHATSAPP_COMPLAINT_SESSION_TIMEOUT_MINUTES": (
        1440,
        "Minutes before an inactive WhatsApp complaint chat session resets to the main menu",
    ),
    "REGISTRATION_PURCHASE_DAYS_LIMIT": (60, "Max days prior to registration that purchase date is accepted"),
}
