from dulux_chatbot.audit_logs.services import build_instance_snapshot
from dulux_chatbot.complaints.models import Complaint


def build_complaint_snapshot(complaint: Complaint) -> dict:
    return build_instance_snapshot(
        complaint,
        extra_data={
            "images": [
                {
                    "id": complaint_image.id,
                    "image_id": complaint_image.image_id,
                }
                for complaint_image in complaint.images.order_by("id")
            ],
        },
    )


def build_complaint_before_snapshot(complaint: Complaint) -> dict:
    return build_instance_snapshot(
        complaint,
        extra_data={
            "image_ids": list(complaint.images.order_by("id").values_list("image_id", flat=True)),
        },
    )


def build_complaint_event_label(*, action: str | None) -> str:
    action_labels = {
        "ASSIGN": "Complaint assigned",
        "RESOLVE": "Complaint resolved",
        "CLOSE": "Complaint closed",
        "REOPEN": "Complaint reopened",
    }
    return action_labels.get(action or "", "Complaint updated")
