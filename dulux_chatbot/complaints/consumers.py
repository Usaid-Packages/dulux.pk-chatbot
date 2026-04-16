from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.authentication import JWTAuthentication

from dulux_chatbot.chatbot.services.sessions import activate_complaint_chat_session
from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppAPIError, WhatsAppClient
from dulux_chatbot.complaints.choices import MessageSender
from dulux_chatbot.complaints.models import ChatMessage, Complaint


# TODO(audit P3-WS Important): _connect_validated does two unrelated jobs under
# one name — (1) assign self.group_name, (2) authorize. The base's `return True`
# is unreachable because every subclass must override it to set group_name
# (otherwise channel_layer.group_add raises AttributeError).
# ComplaintQueueConsumer overrides it just to set group_name = "complaints" and
# always returns True — the name lies about the behavior. Also, that means any
# authenticated dashboard user subscribes to every complaint's created-event
# (missing authorization).
#
# Refactor:
#   async def _resolve_group_name(self) -> str | None: ...   # required
#   async def _is_authorized(self) -> bool: return True      # optional hook
# Then `connect()` calls them in order: resolve group → check auth → group_add.
# The default True becomes meaningful (sensible default for the auth hook only),
# and ComplaintQueueConsumer gets a real `_is_authorized` that checks role.
class AuthenticatedConsumer(AsyncJsonWebsocketConsumer):
    group_name: str

    async def connect(self) -> None:
        self.user = await self._get_user()

        if self.user is None:
            await self.close(code=4401)
            return

        is_valid = await self._connect_validated()
        if not is_valid:
            return
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def _connect_validated(self) -> bool:
        return True

    async def disconnect(self, _close_code: int) -> None:
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def _get_user(self):
        query_string = self.scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [None])[0]
        if not token:
            return None

        return await sync_to_async(self._authenticate_token)(token)

    def _authenticate_token(self, token: str):
        try:
            jwt_authentication = JWTAuthentication()
            validated_token = jwt_authentication.get_validated_token(token)
            user = jwt_authentication.get_user(validated_token)
        except Exception:
            return None
        if user is None or not user.is_authenticated:
            return None
        return user


class ComplaintChatConsumer(AuthenticatedConsumer):
    async def _connect_validated(self) -> bool:
        self.complaint_id = self.scope["url_route"]["kwargs"]["complaint_id"]
        self.group_name = f"complaint_{self.complaint_id}"
        complaint_exists = await self._complaint_exists()
        if not complaint_exists:
            await self.close(code=4404)
            return False
        return True

    async def receive_json(self, content: dict, **_kwargs) -> None:
        text = str(content.get("text", "")).strip()
        if not text:
            await self.send_json({"error": "Text is required."})
            return

        message = await self._create_message(sender=MessageSender.CS_AGENT, text=text)
        phone_number = await self._get_complaint_phone_number()
        try:
            await sync_to_async(WhatsAppClient().send_text)(phone_number, text)
        except WhatsAppAPIError:
            await self.send_json({"error": "Message saved but could not be sent to WhatsApp.", "message": message})
            return
        await sync_to_async(activate_complaint_chat_session)(phone_number=phone_number, complaint_id=self.complaint_id)
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.message",
                "message": message,
            },
        )

    async def chat_message(self, event: dict) -> None:
        await self.send_json(event.get("message", {}))

    @database_sync_to_async
    def _complaint_exists(self) -> bool:
        return Complaint.objects.filter(pk=self.complaint_id).exists()

    @database_sync_to_async
    def _get_complaint_phone_number(self) -> str:
        return str(Complaint.objects.only("phone_number").get(pk=self.complaint_id).phone_number)

    @database_sync_to_async
    def _create_message(self, *, sender: str, text: str) -> dict:
        message = ChatMessage.objects.create(
            complaint_id=self.complaint_id,
            sender=sender,
            text=text,
        )
        return {
            "id": message.id,
            "sender": message.sender,
            "text": message.text,
            "created": message.created.isoformat(),
        }


class ComplaintQueueConsumer(AuthenticatedConsumer):
    async def _connect_validated(self) -> bool:
        self.group_name = "complaints"
        return True

    async def complaint_created(self, event: dict) -> None:
        await self.send_json(
            {
                "event": "complaint.created",
                "complaint": event.get("complaint", {}),
            }
        )
