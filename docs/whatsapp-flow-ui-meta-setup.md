# WhatsApp Flow UI Setup

This document explains how to integrate the new WhatsApp button menu and Meta WhatsApp Flows.

## Overview

The chatbot now supports:

- Main menu with 3 reply buttons: `Dulux Assurance`, `Find a product`, `Raise complaint`
- Dulux Assurance submenu with 3 reply buttons: `Registration`, `Warranty Claim`, `Reissuance`
- Meta WhatsApp Flow launch for all 5 journeys when Flow IDs are configured
- Existing text/numeric chatbot flows as fallback when Flow IDs are not configured

## Backend Endpoints

### WhatsApp Webhook

`POST /api/v1/chatbot/webhook/`

Used by Meta for incoming WhatsApp messages and Flow completion replies.

### WhatsApp Flow Data Exchange

`POST /api/v1/chatbot/flows/data-exchange/`

Use this as the Flow endpoint / data channel URL in Meta.

This endpoint expects Meta encrypted Flow payloads and returns encrypted Flow responses. Do not call it directly from frontend.

## Environment Variables

Configure these in the backend environment after creating and publishing the flows in Meta:

```env
WHATSAPP_FLOW_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
WHATSAPP_APP_SECRET="meta-app-secret"
WHATSAPP_FLOW_ID_WARRANTY_REGISTRATION="123..."
WHATSAPP_FLOW_ID_WARRANTY_CLAIM="123..."
WHATSAPP_FLOW_ID_CERTIFICATE_REISSUANCE="123..."
WHATSAPP_FLOW_ID_FIND_PRODUCT="123..."
WHATSAPP_FLOW_ID_COMPLAINT="123..."
```

If a Flow ID is missing, the backend automatically starts the existing text-based chatbot flow.

## Button IDs

Main menu:

```json
[
  {"id": "menu_dulux_assurance", "title": "Dulux Assurance"},
  {"id": "menu_find_product", "title": "Find a product"},
  {"id": "menu_raise_complaint", "title": "Raise complaint"}
]
```

Dulux Assurance submenu:

```json
[
  {"id": "assurance_registration", "title": "Registration"},
  {"id": "assurance_claim", "title": "Warranty Claim"},
  {"id": "assurance_reissuance", "title": "Reissuance"}
]
```

Note: WhatsApp reply button labels have a short title limit, so `Warranty Registration` is displayed as `Registration` in the submenu body context.

## Flow Names

Use these exact Flow names in Meta and include the same `flow_name` in terminal payloads:

```json
[
  "Warranty Registration",
  "Warranty Claim",
  "Find a Product",
  "Raise a Complaint",
  "Certificate Reissuance"
]
```

## Flow Completion Payloads

Each terminal `complete` action should include:

- `flow_name`
- `flow_token`
- The flow-specific fields below

### Warranty Registration

Data exchange screens already cache customer/product details. Terminal payload must include invoice media IDs:

```json
{
  "flow_name": "Warranty Registration",
  "flow_token": "${flow_token}",
  "invoice_photos": [
    {"media_id": "${form.invoice_photo_1}"}
  ]
}
```

### Find a Product

```json
{
  "flow_name": "Find a Product",
  "flow_token": "${flow_token}",
  "surface_type": "${form.surface_type}"
}
```

Backend sends matching product details on WhatsApp. If product has an image, the image is sent with product details as caption.

### Raise a Complaint

```json
{
  "flow_name": "Raise a Complaint",
  "flow_token": "${flow_token}",
  "customer_name": "${form.customer_name}",
  "subject": "${form.subject}",
  "description": "${form.description}",
  "images": [
    {"media_id": "${form.complaint_image_1}"}
  ]
}
```

Backend creates the complaint, broadcasts it on the complaint websocket, and keeps the user in the complaint chat session.

### Warranty Claim

```json
{
  "flow_name": "Warranty Claim",
  "flow_token": "${flow_token}",
  "registration_code": "${form.registration_code}",
  "paint_pair": "${form.paint_pair}",
  "issue_type": "${form.issue_type}",
  "affected_area_sqft": "${form.affected_area_sqft}",
  "long_shot_photo": {"media_id": "${form.long_shot_photo}"},
  "close_shot_photo": {"media_id": "${form.close_shot_photo}"},
  "alternate_angle_photo": {"media_id": "${form.alternate_angle_photo}"},
  "notes": "${form.notes}"
}
```

Backend validates registration approval, duplicate active claims, issue type, affected area, and required photos.

### Certificate Reissuance

Preferred terminal payload:

```json
{
  "flow_name": "Certificate Reissuance",
  "flow_token": "${flow_token}",
  "registration_id": "${form.registration_id}"
}
```

Alternative supported payloads:

```json
{"registration_code": "1234567890"}
```

```json
{"phone_number": "923001234567"}
```

Backend sends the warranty certificate document and then sends the main menu after a short delay.

## Data Exchange Screen Contracts

These are the screen IDs and dynamic data keys the backend supports.

### Warranty Registration

Screens:

- `CONSENT`
- `CUSTOMER_DETAILS`
- `PURCHASE_DETAILS`
- `PAIR_ONE`
- `ADD_PAIR_TWO`
- `PAIR_TWO`
- `ADD_PAIR_THREE`
- `PAIR_THREE`
- `REVIEW_UPLOAD`

Dynamic data keys:

- `topcoat_options`
- `basecoat_options_one`
- `basecoat_options_two`
- `basecoat_options_three`

### Find a Product

Screens:

- `SELECT_ENVIRONMENT`
- `SELECT_SURFACE`
- `REVIEW`

Dynamic data keys:

- `environment_options`
- `surface_type_options`
- `product_summary`

### Warranty Claim

Screens:

- `REGISTRATION_LOOKUP`
- `PAINT_PAIR_SELECT`
- `CLAIM_DETAILS`
- `CLAIM_PHOTOS`

Dynamic data keys:

- `issue_type_options`
- `paint_pair_options`
- `registration_id`
- `registration_code`

### Raise a Complaint

Screens:

- `COMPLAINT_DETAILS`
- `COMPLAINT_REVIEW`

### Certificate Reissuance

Screens:

- `PHONE_LOOKUP`
- `REGISTRATION_SELECT`

Dynamic data keys:

- `registration_options`

## Meta Setup Steps

1. Go to Meta Business Manager and open WhatsApp Manager for the connected WhatsApp Business Account.
2. Open WhatsApp Flows and create 5 flows using the exact names listed above.
3. Add the Flow JSON screens and field names according to the contracts in this document.
4. Configure the Flow endpoint / data channel URL as:

```text
https://<your-domain>/api/v1/chatbot/flows/data-exchange/
```

5. Generate a 2048-bit RSA private/public key pair for Flow encryption.
6. Add the public key to the WhatsApp phone number Flow encryption settings in Meta.
7. Put the private key in backend env as `WHATSAPP_FLOW_PRIVATE_KEY`.
8. Put the Meta app secret in backend env as `WHATSAPP_APP_SECRET`.
9. Publish each Flow in Meta.
10. Copy each published Flow ID into the backend env variables listed above.
11. Restart Django, Celery, and Daphne after env updates.
12. Send `MAIN MENU` to the WhatsApp number and verify the new button menu.

Official Meta references:

- [WhatsApp Flows documentation](https://developers.facebook.com/docs/whatsapp/flows)
- [Flow JSON reference](https://developers.facebook.com/docs/whatsapp/flows/reference/flowjson)
- [Cloud API messages reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)

## Testing Checklist

- Send `MAIN MENU`; 3 main buttons are shown.
- Tap `Dulux Assurance`; 3 submenu buttons are shown.
- Tap each submenu button; the matching Meta Flow opens if its Flow ID exists.
- Remove one Flow ID locally; tapping the same button starts the old text flow fallback.
- Complete each Flow and confirm backend creates/sends the expected result.
- For complaint flow, confirm the complaint appears in the websocket queue and user replies continue in complaint chat.
