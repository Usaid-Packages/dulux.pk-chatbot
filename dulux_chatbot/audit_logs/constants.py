from dulux_chatbot.audit_logs.choices import AuditAction


AUDIT_EXCLUDED_SNAPSHOT_FIELDS = {"password", "last_login", "created", "modified"}
AUDIT_DEFAULT_ACTION_LABELS = {
    AuditAction.CREATE: "created",
    AuditAction.UPDATE: "updated",
    AuditAction.DELETE: "deleted",
}
AUDIT_RELATED_DISPLAY_FIELDS = (
    "registration_code",
    "email",
    "name",
    "subject",
    "phone_number",
    "customer_name",
    "role",
)
