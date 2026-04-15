IMAGE_UPLOAD_NOTE = "Note : Please add one Invoice image at a time"
MIN_EXCLUSIVE_WHATSAPP_WARRANTY_OPTION_YEARS = 0

MAIN_MENU_DULUX_ASSURANCE_ID = "menu_dulux_assurance"
MAIN_MENU_FIND_PRODUCT_ID = "menu_find_product"
MAIN_MENU_COMPLAINT_ID = "menu_raise_complaint"

ASSURANCE_REGISTRATION_ID = "assurance_registration"
ASSURANCE_CLAIM_ID = "assurance_claim"
ASSURANCE_REISSUANCE_ID = "assurance_reissuance"

MAIN_MENU_TEXT = (
    "How can I assist you?\n\n"
    "Choose one option below. Dulux Assurance includes Warranty Registration, Warranty Claim, "
    "and Certificate Reissuance."
)

MAIN_MENU_BUTTONS = [
    {"type": "reply", "reply": {"id": MAIN_MENU_DULUX_ASSURANCE_ID, "title": "Dulux Assurance"}},
    {"type": "reply", "reply": {"id": MAIN_MENU_FIND_PRODUCT_ID, "title": "Find a product"}},
    {"type": "reply", "reply": {"id": MAIN_MENU_COMPLAINT_ID, "title": "Raise complaint"}},
]

ASSURANCE_MENU_TEXT = "Please choose a Dulux Assurance service."

ASSURANCE_MENU_BUTTONS = [
    {"type": "reply", "reply": {"id": ASSURANCE_REGISTRATION_ID, "title": "Registration"}},
    {"type": "reply", "reply": {"id": ASSURANCE_CLAIM_ID, "title": "Warranty Claim"}},
    {"type": "reply", "reply": {"id": ASSURANCE_REISSUANCE_ID, "title": "Reissuance"}},
]
