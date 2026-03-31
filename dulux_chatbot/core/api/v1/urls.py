from django.urls import path

from dulux_chatbot.core.api.v1.views import HealthAPIView


urlpatterns = [
    path("health/", HealthAPIView.as_view(), name="django_health_check"),
]
