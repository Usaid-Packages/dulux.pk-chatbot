from typing import TypeVar

from django.db.models import Model


RelatedModel = TypeVar("RelatedModel", bound=Model)


# TODO(audit P2-11 Suggestion): Loads ALL prefetched reviews into Python to find
# the latest via max(). For normal use (1-5 per claim) this is fine, but unbounded
# — if a claim accumulates hundreds of reviews (admin tool, migration), it grows
# linearly. Consider a Prefetch object with queryset.order_by("-created", "-id")[:1]
# to limit at the DB level instead of loading all into memory.
def latest_prefetched(instance: Model, related_name: str) -> RelatedModel | None:
    prefetched_objects = getattr(instance, "_prefetched_objects_cache", {})
    if related_name in prefetched_objects:
        related_items = prefetched_objects[related_name]
        return max(related_items, key=lambda item: (item.created, item.id), default=None)
    return getattr(instance, related_name).order_by("-created", "-id").first()
