import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

django_asgi_app = get_asgi_application()

from dulux_chatbot.complaints.routing import websocket_urlpatterns
from dulux_chatbot.core.websocket_auth import JWTAuthMiddleware


application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddleware(AuthMiddlewareStack(URLRouter(websocket_urlpatterns))),
    }
)
