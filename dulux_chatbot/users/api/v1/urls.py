from dj_rest_auth.jwt_auth import get_refresh_view
from dj_rest_auth.views import (
    LoginView,
    PasswordResetConfirmView,
    PasswordResetView,
)
from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView

from dulux_chatbot.users.api.v1.views import DashboardAnalyticsAPIView, DashboardCardsAPIView


urlpatterns = [
    path("login/", LoginView.as_view(), name="rest_login"),
    path("password/reset/", PasswordResetView.as_view(), name="rest_password_reset"),
    path(
        "password/reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="rest_password_reset_confirm",
    ),
    path("token/refresh/", get_refresh_view().as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("cards/", DashboardCardsAPIView.as_view(), name="dashboard_cards"),
    path("analytics/", DashboardAnalyticsAPIView.as_view(), name="dashboard_analytics"),
]
