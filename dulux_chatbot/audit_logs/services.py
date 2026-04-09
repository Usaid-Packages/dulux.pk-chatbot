from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

from django.contrib.contenttypes.models import ContentType
from django.db.models import Model

from dulux_chatbot.audit_logs.choices import AuditAction
from dulux_chatbot.audit_logs.models import AuditLog


EXCLUDED_SNAPSHOT_FIELDS = {"password", "last_login", "created", "modified"}


def _serialize_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Path):
        return str(value)
    if hasattr(value, "name") and hasattr(value, "storage"):
        return value.name or ""
    if isinstance(value, (list, tuple)):
        return [_serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _serialize_value(item) for key, item in value.items()}
    return value


def build_instance_snapshot(instance: Model, *, extra_data: dict[str, Any] | None = None) -> dict[str, Any]:
    snapshot: dict[str, Any] = {}
    for field in instance._meta.concrete_fields:
        if field.name in EXCLUDED_SNAPSHOT_FIELDS:
            continue
        value = getattr(instance, field.attname)
        snapshot[field.name] = _serialize_value(value)
    for field in instance._meta.many_to_many:
        if not instance.pk:
            snapshot[field.name] = []
            continue
        snapshot[field.name] = list(getattr(instance, field.name).order_by("pk").values_list("pk", flat=True))
    if extra_data:
        for key, value in extra_data.items():
            snapshot[key] = _serialize_value(value)
    return snapshot


def build_snapshot_diff(before_data: dict[str, Any], after_data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    changes: dict[str, dict[str, Any]] = {}
    keys = set(before_data) | set(after_data)
    for key in sorted(keys):
        before_value = before_data.get(key)
        after_value = after_data.get(key)
        if before_value != after_value:
            changes[key] = {"before": before_value, "after": after_value}
    return changes


def create_audit_log(
    *,
    actor,
    action: str,
    instance: Model,
    request=None,
    before_data: dict[str, Any] | None = None,
    after_data: dict[str, Any] | None = None,
    changes: dict[str, Any] | None = None,
) -> AuditLog | None:
    if actor is None or not getattr(actor, "is_authenticated", False):
        return None

    content_type = ContentType.objects.get_for_model(instance.__class__)
    resolved_object_id = instance.pk
    if resolved_object_id is None and before_data is not None:
        resolved_object_id = before_data.get("id")
    if resolved_object_id is None and after_data is not None:
        resolved_object_id = after_data.get("id")
    return AuditLog.objects.create(
        actor=actor,
        actor_email=getattr(actor, "email", "") or "",
        action=action,
        content_type=content_type,
        object_id=str(resolved_object_id),
        model_label=f"{instance._meta.app_label}.{instance.__class__.__name__}",
        object_repr=str(instance),
        before_data=before_data,
        after_data=after_data,
        changes=changes,
    )


def log_create(*, actor, instance: Model, request=None, after_data: dict[str, Any] | None = None) -> AuditLog | None:
    final_after_data = after_data if after_data is not None else build_instance_snapshot(instance)
    return create_audit_log(
        actor=actor,
        action=AuditAction.CREATE,
        instance=instance,
        request=request,
        after_data=final_after_data,
    )


def log_update(
    *,
    actor,
    instance: Model,
    request=None,
    before_data: dict[str, Any],
    after_data: dict[str, Any] | None = None,
) -> AuditLog | None:
    final_after_data = after_data if after_data is not None else build_instance_snapshot(instance)
    changes = build_snapshot_diff(before_data, final_after_data)
    if not changes:
        return None
    return create_audit_log(
        actor=actor,
        action=AuditAction.UPDATE,
        instance=instance,
        request=request,
        before_data=before_data,
        after_data=final_after_data,
        changes=changes,
    )


def log_delete(
    *,
    actor,
    instance: Model,
    request=None,
    before_data: dict[str, Any] | None = None,
) -> AuditLog | None:
    final_before_data = before_data if before_data is not None else build_instance_snapshot(instance)
    return create_audit_log(
        actor=actor,
        action=AuditAction.DELETE,
        instance=instance,
        request=request,
        before_data=final_before_data,
    )
