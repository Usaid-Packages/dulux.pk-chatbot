import logging

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken


logger = logging.getLogger("dulux_chatbot")
User = get_user_model()


@database_sync_to_async
def get_user_from_token(token: str):
    try:
        access_token = AccessToken(token)
        return User.objects.get(id=access_token.payload.get("user_id"))
    except (InvalidToken, TokenError, User.DoesNotExist) as e:
        logger.error("WebSocket authentication failed: %s", e)
        return None


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        token = None
        for param in query_string.split("&"):
            if param.startswith("token="):
                token = param.split("=", 1)[1]
                break

        if not token:
            logger.warning("No WebSocket token provided.")
            await send({"type": "websocket.close", "code": 4000})
            return

        user = await get_user_from_token(token)
        if user is None:
            await send({"type": "websocket.close", "code": 4001})
            return

        scope["user"] = user
        return await super().__call__(scope, receive, send)
