from typing import TypeVar

from django.db.models import Model


RelatedModel = TypeVar("RelatedModel", bound=Model)


def latest_prefetched(instance: Model, related_name: str) -> RelatedModel | None:
    prefetched_objects = getattr(instance, "_prefetched_objects_cache", {})
    if related_name in prefetched_objects:
        related_items = prefetched_objects[related_name]
        return max(related_items, key=lambda item: (item.created, item.id), default=None)
    return getattr(instance, related_name).order_by("-created", "-id").first()
