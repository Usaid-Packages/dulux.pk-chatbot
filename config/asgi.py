import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

django_asgi_app = get_asgi_application()

from dulux_chatbot.complaints.routing import websocket_urlpatterns


# TODO(audit SEC-10 Medium): AuthMiddlewareStack provides Django session auth for
# WebSockets, but the consumers use manual JWT parsing from query string. The
# AuthMiddlewareStack layer is effectively bypassed/redundant. This dual-auth setup is
# confusing — either use TokenAuthMiddleware wrapping JWT properly, or remove
# AuthMiddlewareStack. The current JWT-in-query-string approach also exposes tokens
# in server access logs and browser history.
application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)
