from django.urls import path

from dulux_chatbot.audit_logs.api.v1.views import AuditLogDetailAPIView, AuditLogListAPIView


urlpatterns = [
    path("", AuditLogListAPIView.as_view(), name="audit_log_list"),
    path("<int:pk>/", AuditLogDetailAPIView.as_view(), name="audit_log_detail"),
]
