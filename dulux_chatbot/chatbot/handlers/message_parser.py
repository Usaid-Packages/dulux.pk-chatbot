import json


def parse_incoming_message(payload: dict) -> dict | None:
    entry = (payload.get("entry") or [{}])[0]
    change = ((entry.get("changes") or [{}])[0]).get("value", {})
    messages = change.get("messages") or []
    if not messages:
        return None

    message = messages[0]
    message_type = message.get("type")
    parsed_message = {
        "message_id": message.get("id"),
        "from": message.get("from"),
        "type": message_type,
        "text": "",
        "media_id": None,
        "interactive_id": None,
        "flow_response": None,
    }

    if message_type == "text":
        parsed_message["text"] = ((message.get("text") or {}).get("body") or "").strip()
    elif message_type == "image":
        parsed_message["media_id"] = (message.get("image") or {}).get("id")
    elif message_type == "document":
        parsed_message["media_id"] = (message.get("document") or {}).get("id")
    elif message_type == "interactive":
        interactive = message.get("interactive") or {}
        button_reply = interactive.get("button_reply") or {}
        list_reply = interactive.get("list_reply") or {}
        flow_reply = interactive.get("nfm_reply") or {}
        parsed_message["interactive_id"] = button_reply.get("id") or list_reply.get("id")
        parsed_message["text"] = button_reply.get("title") or list_reply.get("title") or ""
        if flow_reply:
            parsed_message["interactive_id"] = flow_reply.get("name") or "whatsapp_flow_response"
            parsed_message["text"] = flow_reply.get("body") or ""
            parsed_message["flow_response"] = _parse_flow_response(flow_reply.get("response_json"))
    else:
        return None

    if not parsed_message.get("message_id") or not parsed_message.get("from"):
        return None
    return parsed_message


def _parse_flow_response(response_json: str | None) -> dict:
    if not response_json:
        return {}
    try:
        parsed_response = json.loads(response_json)
    except (TypeError, ValueError):
        return {}
    return parsed_response if isinstance(parsed_response, dict) else {}
