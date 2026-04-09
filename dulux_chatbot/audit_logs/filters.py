import django_filters

from dulux_chatbot.audit_logs.models import AuditLog


class AuditLogFilter(django_filters.FilterSet):
    actor = django_filters.NumberFilter(field_name="actor_id")
    date_from = django_filters.DateFilter(field_name="created", lookup_expr="date__gte")
    date_to = django_filters.DateFilter(field_name="created", lookup_expr="date__lte")

    class Meta:
        model = AuditLog
        fields = ("action", "actor", "model_label", "object_id", "date_from", "date_to")
