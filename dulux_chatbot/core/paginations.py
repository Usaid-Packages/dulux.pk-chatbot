from rest_framework import pagination


class PageNumberPagination(pagination.PageNumberPagination):
    page_size = 10
    max_page_size = 100
    page_size_query_param = "page_size"


# TODO(audit C4): This class defeats pagination — setting page_size to the full
# count loads every row into memory and will OOM on any large list endpoint it is
# attached to. It also runs COUNT(*) twice (here and in super().paginate_queryset).
# Not referenced anywhere currently; delete it. If an "all rows" endpoint is ever
# needed, enforce a hard cap (queryset[:MAX_EXPORT_ROWS]) or route large exports
# through Celery to S3.
class NoPagination(pagination.PageNumberPagination):
    page_size = None
    max_page_size = None
    page_size_query_param = None

    def paginate_queryset(self, queryset, request, view=None):
        self.page_size = queryset.count() or 1  # To make response consistent
        return super().paginate_queryset(queryset, request, view)
