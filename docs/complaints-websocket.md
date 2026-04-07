# Complaint Chat WebSocket

## Purpose

This socket provides the live 2-way complaint chat channel for the dashboard.

Frontend should:
- connect to the complaint room websocket
- listen for incoming chat events
- send CS agent messages over the same websocket

Backend will:
- authenticate the socket connection using JWT
- save CS agent messages to the database
- forward CS agent messages to the customer on WhatsApp
- broadcast new messages to all connected clients in the complaint room

## WebSocket URL

Use `wss` on HTTPS environments:

```text
wss://<your-domain>/ws/complaints/<complaint_id>/chat/?token=<jwt_access_token>
```

Local/dev example:

```text
ws://localhost:8000/ws/complaints/1/chat/?token=<jwt_access_token>
```

Stage example:

```text
wss://dulux.pk.cogentlabs.co.uk/ws/complaints/1/chat/?token=<jwt_access_token>
```

## Authentication

- JWT access token is required in the `token` query param
- unauthenticated connection is rejected

Close codes:
- `4401` = invalid or missing token
- `4404` = complaint does not exist

## Handshake Rules

The socket connection is accepted when:
- the JWT token is valid
- the user is authenticated
- the complaint exists

Current behavior:
- the socket does not currently require the complaint to be assigned to the connected user

## Client -> Server Message Format

To send a CS reply, send JSON like:

```json
{
  "text": "Hello from CS"
}
```

Rules:
- `text` is required
- blank text is rejected

Validation error response:

```json
{
  "error": "Text is required."
}
```

## Server -> Client Success Message Format

When a message is accepted, saved, and broadcast, connected clients receive:

```json
{
  "id": 12,
  "sender": "CS_AGENT",
  "text": "Hello from CS",
  "created": "2026-04-07T10:15:00.123456+00:00"
}
```

Notes:
- `sender` can be `CS_AGENT` or `CUSTOMER`
- customer-originated complaint messages are also broadcast into the same room by the backend

## WhatsApp Forwarding

When the dashboard sends a CS agent message over the websocket:
1. backend saves the message as a `ChatMessage`
2. backend sends the same text to the customer on WhatsApp
3. backend broadcasts the message to the complaint room

So the websocket is now the primary live-chat send path for complaint conversations.

## WhatsApp Delivery Failure Event

If the message is saved but WhatsApp delivery fails, the server sends:

```json
{
  "error": "Message saved but could not be sent to WhatsApp.",
  "message": {
    "id": 12,
    "sender": "CS_AGENT",
    "text": "Hello from CS",
    "created": "2026-04-07T10:15:00.123456+00:00"
  }
}
```

Frontend should:
- show the message in the chat if desired
- also show a delivery-failure warning to the agent

## Recommended Frontend Flow

1. Fetch complaint detail using REST:

```text
GET /api/v1/complaints/<complaint_id>/
```

2. Render existing `messages`

3. Open the websocket connection for that complaint

4. Listen for incoming message events

5. Send new CS replies through the websocket, not through the message-create REST API

## Recommended Frontend Send Example

```js
socket.send(JSON.stringify({ text: "Hello from CS" }));
```

## Recommended Frontend Receive Example

```js
socket.onmessage = (event) => {
  const payload = JSON.parse(event.data);

  if (payload.error) {
    console.error(payload.error);
    return;
  }

  console.log("chat message", payload);
};
```

## REST API Relationship

Complaint REST APIs still exist for:
- complaint listing
- complaint detail
- complaint status updates

Relevant REST endpoints:
- `GET /api/v1/complaints/`
- `GET /api/v1/complaints/<complaint_id>/`
- `PATCH /api/v1/complaints/<complaint_id>/`

For live agent messaging, use the websocket.

## Important Limitation

Customer complaint threading is currently session-based on the WhatsApp chatbot side.

That means:
- if the customer stays in the complaint chat session, replies continue to attach to the same complaint
- if the WhatsApp session expires or the user leaves the complaint flow, later messages will not automatically reattach to that complaint unless additional routing logic is added

## Summary

- use websocket to connect
- use websocket to send CS replies
- use websocket to receive live updates
- use REST only for complaint list/detail/status management
