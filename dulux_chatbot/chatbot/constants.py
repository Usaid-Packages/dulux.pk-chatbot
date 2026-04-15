# TODO(audit P1-9 Suggestion): Magic strings for step names ("menu", "chat") and
# menu commands ("0", "00", "MENU", "MAIN MENU") are scattered across
# dispatcher.py, flows/base.py, and every flow file — 20+ occurrences. Renaming
# requires grep-and-replace everywhere; typos fail silently. Centralize here:
#   STEP_MENU = "menu"
#   STEP_CHAT = "chat"
#   CMD_GO_BACK = "0"
#   CMD_MAIN_MENU = "00"
#   CMD_MAIN_MENU_WORDS = frozenset({"MENU", "MAIN MENU"})
# Then import across the chatbot app and remove the literals.
IMAGE_UPLOAD_NOTE = "Note : Please add one Invoice image at a time"
MIN_EXCLUSIVE_WHATSAPP_WARRANTY_OPTION_YEARS = 0

MAIN_MENU_TEXT = (
    "How can I assist you? Reply with:\n"
    "1. Warranty Registration\n"
    "2. Warranty Claim\n"
    "3. Find a Product\n"
    "4. Raise a Complaint\n"
    "5. Certificate Reissuance"
)
