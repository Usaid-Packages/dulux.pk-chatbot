from rest_framework import pagination


class PageNumberPagination(pagination.PageNumberPagination):
    page_size = 10
    max_page_size = 100
    page_size_query_param = "page_size"


# TODO(audit C4 Critical): Defeats pagination — page_size set to full count loads
# every row into memory, will OOM on large list endpoints. Also double-counts
# (count() here + count() in super). Not referenced anywhere currently — delete it.
# If an "all rows" endpoint is ever needed, enforce a hard cap or export via Celery.
# Not needed because this is only used for complaint chat messages, which are not
# expected to grow into a large paginated dataset in current business flow.
class NoPagination(pagination.PageNumberPagination):
    page_size = None
    max_page_size = None
    page_size_query_param = None

    def paginate_queryset(self, queryset, request, view=None):
        self.page_size = queryset.count() or 1  # To make response consistent
        return super().paginate_queryset(queryset, request, view)
