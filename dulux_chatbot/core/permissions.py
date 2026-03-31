from rest_framework.permissions import BasePermission

from dulux_chatbot.users.choices import UserRole


class IsCSAgent(BasePermission):
    def has_permission(self, request, _view):
        return request.user.role == UserRole.CS_AGENT


class IsQualityReviewer(BasePermission):
    def has_permission(self, request, _view):
        return request.user.role == UserRole.QUALITY_REVIEWER


class IsAdminUser(BasePermission):
    def has_permission(self, request, _view):
        return request.user.role == UserRole.ADMIN


class IsCSAgentOrAdmin(BasePermission):
    def has_permission(self, request, _view):
        return request.user.role in (UserRole.CS_AGENT, UserRole.ADMIN)


class IsQualityReviewerOrAdmin(BasePermission):
    def has_permission(self, request, _view):
        return request.user.role in (UserRole.QUALITY_REVIEWER, UserRole.ADMIN)
