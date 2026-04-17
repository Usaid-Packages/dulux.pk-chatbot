from datetime import date, timedelta
from unittest.mock import patch
from uuid import uuid4

from django.core.files.base import ContentFile
from django.test import TestCase
from django.utils import timezone

from dulux_chatbot.chatbot.flows.base import BaseFlow
from dulux_chatbot.chatbot.flows.claim import ClaimFlow
from dulux_chatbot.chatbot.flows.claim_resubmission import ClaimResubmissionFlow
from dulux_chatbot.chatbot.handlers.dispatcher import dispatch
from dulux_chatbot.chatbot.models import WhatsAppSession
from dulux_chatbot.chatbot.tasks import send_find_product_results, send_whatsapp_main_menu
from dulux_chatbot.complaints.models import ChatMessage, Complaint
from dulux_chatbot.products.tests.factories import (
    attach_product_image,
    create_product,
    create_product_basecoat,
    create_product_surface_mapping,
    create_surface_type,
)
from dulux_chatbot.warranty.choices import ClaimState, InvoiceType, IssueType, QualityDecisionType, RegistrationState
from dulux_chatbot.warranty.models import (
    ClaimQualityReview,
    ClaimQualityReviewItem,
    PaintPairInvoice,
    WarrantyClaim,
    WarrantyRegistration,
)
from dulux_chatbot.warranty.tasks import send_claim_resubmit_notification, send_registration_resubmit_notification
from dulux_chatbot.warranty.tests.factories import (
    create_claim,
    create_paint_pair,
    create_quality_user,
    create_registration,
)


class DummyClient:
    def __init__(self):
        self.text_messages = []
        self.documents = []
        self.images = []
        self.downloaded_media_ids = []
        self.media_metadata = {}

    def send_text(self, to: str, text: str) -> None:
        self.text_messages.append({"to": to, "text": text})

    def send_document(self, to: str, document_url: str, filename: str, caption: str = "") -> None:
        self.documents.append(
            {
                "to": to,
                "document_url": document_url,
                "filename": filename,
                "caption": caption,
            }
        )

    def send_image(self, to: str, image_url: str, caption: str = "") -> None:
        self.images.append(
            {
                "to": to,
                "image_url": image_url,
                "caption": caption,
            }
        )

    def download_media(self, media_id: str) -> bytes:
        self.downloaded_media_ids.append(media_id)
        return b"fake-image-bytes"

    def download_media_with_metadata(self, media_id: str) -> tuple[bytes, dict]:
        self.downloaded_media_ids.append(media_id)
        return b"fake-image-bytes", self.media_metadata.get(media_id, {"mime_type": "image/jpeg"})


# TODO(audit P1-7 Important): Happy-path only. Missing: claim < 3 or > 3 photos,
# duplicate claim for same paint pair (BLOCKING_CLAIM_STATES guard), complaint
# with 0 images, session expiry mid-resubmission, assertNumQueries on hot paths.
class FlowTests(TestCase):
    def setUp(self):
        unique_suffix = str(uuid4().int)[:7]
        self.phone_number = f"92300{unique_suffix}"
        self.session = WhatsAppSession.objects.create(phone_number=self.phone_number)
        self.client = DummyClient()

    def dispatch_text(self, text: str) -> None:
        dispatch(
            session=self.session,
            message={"text": text, "interactive_id": None, "media_id": None},
            client=self.client,
        )
        self.session.refresh_from_db()

    def dispatch_image(self, media_id: str) -> None:
        dispatch(
            session=self.session,
            message={"text": "", "interactive_id": None, "media_id": media_id, "type": "image"},
            client=self.client,
        )
        self.session.refresh_from_db()

    def dispatch_document(self, media_id: str) -> None:
        dispatch(
            session=self.session,
            message={"text": "", "interactive_id": None, "media_id": media_id, "type": "document"},
            client=self.client,
        )
        self.session.refresh_from_db()

    def test_dispatch_shows_menu_for_unknown_input(self):
        self.dispatch_text("unknown")

        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertIn("Warranty Registration", self.client.text_messages[-1]["text"])

    def test_save_media_image_uses_whatsapp_mime_type_extension(self):
        self.client.media_metadata["png-media"] = {"mime_type": "image/png"}

        image = BaseFlow(session=self.session, client=self.client)._save_media_image(
            "png-media",
            filename_prefix="test_upload",
        )

        self.assertTrue(image.image.name.endswith(".png"))

    def test_registration_flow_end_to_end(self):
        topcoat = create_product(name="Flow Topcoat")
        basecoat = create_product(name="Flow Basecoat", product_type="BASECOAT", warranty_years=3)
        create_product_basecoat(topcoat=topcoat, basecoat=basecoat)

        self.dispatch_text("1")
        self.assertEqual(self.session.flow, "REGISTRATION")
        self.assertEqual(self.session.current_step, "consent")

        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")
        self.dispatch_text("customer@example.com")
        self.dispatch_text("Karachi")
        self.dispatch_text("Sindh")
        self.dispatch_text("123 Street")
        self.dispatch_text(str(date.today() - timedelta(days=1)))
        self.dispatch_text("Dealer")
        self.dispatch_text("Karachi")
        self.dispatch_text("Dealer Address")
        self.dispatch_text("1")
        self.dispatch_text("10.00")
        self.dispatch_text("1")
        self.dispatch_text("5.00")
        self.dispatch_text("NO")
        self.dispatch_image("invoice-media-1")
        self.dispatch_text("DONE")

        registration = WarrantyRegistration.objects.filter(phone_number=self.phone_number).first()
        self.assertIsNotNone(
            registration,
            {
                "phone_number": self.phone_number,
                "session_phone_number": self.session.phone_number,
                "flow": self.session.flow,
                "current_step": self.session.current_step,
                "session_data": self.session.session_data,
                "last_message": self.client.text_messages[-1]["text"],
                "registration_count": WarrantyRegistration.objects.count(),
            },
        )
        self.assertEqual(registration.customer_name, "Customer Name")
        self.assertEqual(registration.paint_pairs.count(), 1)
        self.assertEqual(
            PaintPairInvoice.objects.filter(registration=registration, invoice_type=InvoiceType.TOPCOAT).count(), 1
        )
        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertIn("How can I assist you?", self.client.text_messages[-1]["text"])

    def test_registration_flow_only_lists_products_with_warranty_years_more_than_zero(self):
        create_product(name="Zero Year Topcoat", warranty_years=0)
        topcoat = create_product(name="One Year Topcoat", warranty_years=1)
        create_product_basecoat(
            topcoat=topcoat,
            basecoat=create_product(name="Zero Year Basecoat", product_type="BASECOAT", warranty_years=0),
        )
        create_product_basecoat(
            topcoat=topcoat,
            basecoat=create_product(name="One Year Basecoat", product_type="BASECOAT", warranty_years=1),
        )

        self.dispatch_text("1")
        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")
        self.dispatch_text("customer@example.com")
        self.dispatch_text("Karachi")
        self.dispatch_text("Sindh")
        self.dispatch_text("123 Street")
        self.dispatch_text(str(date.today() - timedelta(days=1)))
        self.dispatch_text("Dealer")
        self.dispatch_text("Karachi")
        self.dispatch_text("Dealer Address")

        self.assertEqual(self.session.current_step, "topcoat_select")
        self.assertIn("One Year Topcoat", self.client.text_messages[-1]["text"])
        self.assertNotIn("Zero Year Topcoat", self.client.text_messages[-1]["text"])

        self.dispatch_text("1")
        self.dispatch_text("10.00")

        self.assertEqual(self.session.current_step, "basecoat_select")
        self.assertIn("One Year Basecoat", self.client.text_messages[-1]["text"])
        self.assertNotIn("Zero Year Basecoat", self.client.text_messages[-1]["text"])

    def test_registration_flow_rejects_invalid_purchase_date(self):
        self.dispatch_text("1")
        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")
        self.dispatch_text("customer@example.com")
        self.dispatch_text("Karachi")
        self.dispatch_text("Sindh")
        self.dispatch_text("123 Street")
        self.dispatch_text("not-a-date")

        self.assertEqual(self.session.current_step, "purchase_date")
        self.assertIn("Invalid date format", self.client.text_messages[-1]["text"])

    def test_registration_requires_at_least_one_invoice_image(self):
        create_product(name="Flow Topcoat")

        self.dispatch_text("1")
        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")
        self.dispatch_text("customer@example.com")
        self.dispatch_text("Karachi")
        self.dispatch_text("Sindh")
        self.dispatch_text("123 Street")
        self.dispatch_text(str(date.today() - timedelta(days=1)))
        self.dispatch_text("Dealer")
        self.dispatch_text("Karachi")
        self.dispatch_text("Dealer Address")
        self.dispatch_text("1")
        self.dispatch_text("10.00")
        self.dispatch_text("SKIP")
        self.dispatch_text("NO")

        self.assertEqual(self.session.current_step, "invoice_upload")
        self.assertIn("Note : Please add one Invoice image at a time", self.client.text_messages[-1]["text"])
        self.dispatch_text("DONE")
        self.assertEqual(self.session.flow, "REGISTRATION")
        self.assertEqual(self.session.current_step, "invoice_upload")
        self.assertIn("At least one invoice image is required", self.client.text_messages[-1]["text"])

    def test_registration_rejects_invalid_topcoat_quantity_immediately(self):
        create_product(name="Flow Topcoat")

        self.dispatch_text("1")
        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")
        self.dispatch_text("customer@example.com")
        self.dispatch_text("Karachi")
        self.dispatch_text("Sindh")
        self.dispatch_text("123 Street")
        self.dispatch_text(str(date.today() - timedelta(days=1)))
        self.dispatch_text("Dealer")
        self.dispatch_text("Karachi")
        self.dispatch_text("Dealer Address")
        self.dispatch_text("1")
        self.dispatch_text("Ah")

        self.assertEqual(self.session.current_step, "topcoat_quantity")
        self.assertIn(
            "Please provide topcoat quantity in liters as a valid number.",
            self.client.text_messages[-1]["text"],
        )

    def test_registration_rejects_invalid_basecoat_quantity_immediately(self):
        topcoat = create_product(name="Flow Topcoat")
        basecoat = create_product(name="Flow Basecoat", product_type="BASECOAT", warranty_years=3)
        create_product_basecoat(topcoat=topcoat, basecoat=basecoat)

        self.dispatch_text("1")
        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")
        self.dispatch_text("customer@example.com")
        self.dispatch_text("Karachi")
        self.dispatch_text("Sindh")
        self.dispatch_text("123 Street")
        self.dispatch_text(str(date.today() - timedelta(days=1)))
        self.dispatch_text("Dealer")
        self.dispatch_text("Karachi")
        self.dispatch_text("Dealer Address")
        self.dispatch_text("1")
        self.dispatch_text("10")
        self.dispatch_text("1")
        self.dispatch_text("Ah")

        self.assertEqual(self.session.current_step, "basecoat_quantity")
        self.assertIn(
            "Please provide basecoat quantity in liters as a valid number.",
            self.client.text_messages[-1]["text"],
        )

    def test_registration_rejects_invalid_email_before_advancing(self):
        self.dispatch_text("1")
        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")
        self.dispatch_text("invalid-email")

        self.assertEqual(self.session.current_step, "email")
        self.assertIn("Please provide a valid email address.", self.client.text_messages[-1]["text"])

    @patch("dulux_chatbot.warranty.tasks.WhatsAppClient", DummyClient)
    def test_claim_resubmit_notification_seeds_session(self):
        registration = create_registration(state=RegistrationState.APPROVED, phone_number=self.phone_number)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.RESUBMIT)
        quality_review = ClaimQualityReview.objects.create(
            claim=claim,
            decision_type=QualityDecisionType.REQUEST_INFO,
            notes="Need daylight closeups.",
            created_by=create_quality_user(),
        )
        ClaimQualityReviewItem.objects.create(
            quality_review=quality_review,
            required_item="CLOSE_UP_DAMAGE_PHOTOS",
        )

        send_claim_resubmit_notification(claim.id)

        session = WhatsAppSession.objects.get(phone_number=self.phone_number)
        self.assertEqual(session.flow, "CLAIM_RESUBMISSION")
        self.assertEqual(session.current_step, "claim_resubmission_item")
        self.assertEqual(session.session_data["claim_resubmission_claim_id"], claim.id)

    def test_claim_resubmission_flow_moves_claim_back_to_qa_review(self):
        registration = create_registration(state=RegistrationState.APPROVED, phone_number=self.phone_number)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.RESUBMIT)
        quality_review = ClaimQualityReview.objects.create(
            claim=claim,
            decision_type=QualityDecisionType.REQUEST_INFO,
            notes="Need more photos.",
            created_by=create_quality_user(email="resubmit-qa@example.com"),
        )
        ClaimQualityReviewItem.objects.create(
            quality_review=quality_review,
            required_item="CLOSE_UP_DAMAGE_PHOTOS",
        )
        self.session.flow = "CLAIM_RESUBMISSION"
        self.session.current_step = "claim_resubmission_item"
        self.session.session_data = {
            "claim_resubmission_claim_id": claim.id,
            "claim_resubmission_review_id": quality_review.id,
            "claim_resubmission_items": ["CLOSE_UP_DAMAGE_PHOTOS"],
            "claim_resubmission_item_index": 0,
            "claim_resubmission_entries": [],
            "claim_resubmission_current_images": [],
        }
        self.session.save(update_fields=["flow", "current_step", "session_data", "modified"])

        self.dispatch_image("claim-resubmit-1")
        self.dispatch_text("DONE")
        self.dispatch_text("Additional context from customer.")

        claim.refresh_from_db()
        self.assertEqual(claim.state, ClaimState.QA_REVIEW)
        self.assertEqual(claim.resubmissions.count(), 1)
        self.assertEqual(claim.resubmissions.first().entries.count(), 1)

    def test_claim_resubmission_prompt_includes_image_note(self):
        self.session.flow = "CLAIM_RESUBMISSION"
        self.session.current_step = "claim_resubmission_item"
        self.session.session_data = {
            "claim_resubmission_items": ["CLOSE_UP_DAMAGE_PHOTOS"],
            "claim_resubmission_item_index": 0,
        }
        self.session.save(update_fields=["flow", "current_step", "session_data", "modified"])

        ClaimResubmissionFlow(session=self.session, client=self.client).send_initial_prompt()

        self.assertIn("Note : Please add one Invoice image at a time", self.client.text_messages[-1]["text"])

    @patch("dulux_chatbot.chatbot.flows.complaint.broadcast_complaint_created")
    def test_whatsapp_complaint_flow_broadcasts_created_complaint(self, broadcast_mock):
        self.dispatch_text("4")
        self.assertEqual(self.session.flow, "COMPLAINT")
        self.assertEqual(self.session.current_step, "subject")

        self.dispatch_text("Wall damage")
        self.assertEqual(self.session.current_step, "description")

        self.dispatch_text("Paint is peeling after recent rain.")
        self.assertEqual(self.session.current_step, "image_upload")

        self.dispatch_text("DONE")

        complaint = Complaint.objects.get(phone_number=self.phone_number)
        broadcast_mock.assert_called_once_with(complaint=complaint)
        self.assertEqual((self.session.session_data or {}).get("complaint_id"), complaint.id)
        self.assertEqual(self.session.current_step, "chat")
        self.assertIn("Note : Please add one Invoice image at a time", self.client.text_messages[-2]["text"])

    def test_registration_rejects_non_image_invoice_upload(self):
        create_product(name="Flow Topcoat")

        self.dispatch_text("1")
        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")
        self.dispatch_text("customer@example.com")
        self.dispatch_text("Karachi")
        self.dispatch_text("Sindh")
        self.dispatch_text("123 Street")
        self.dispatch_text(str(date.today() - timedelta(days=1)))
        self.dispatch_text("Dealer")
        self.dispatch_text("Karachi")
        self.dispatch_text("Dealer Address")
        self.dispatch_text("1")
        self.dispatch_text("10.00")
        self.dispatch_text("SKIP")
        self.dispatch_text("NO")

        self.dispatch_document("invoice-doc-1")

        self.assertEqual(self.session.current_step, "invoice_upload")
        self.assertEqual(self.client.downloaded_media_ids, [])
        self.assertIn("Please upload an image file for the invoice.", self.client.text_messages[-1]["text"])

    @patch("dulux_chatbot.warranty.tasks.EmailMultiAlternatives.send")
    @patch("dulux_chatbot.warranty.tasks.WhatsAppClient.send_text")
    def test_registration_resubmit_notification_creates_active_session(self, send_text_mock, send_email_mock):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.RESUBMIT)
        registration.rejection_fields.create(field_name="email", note="Please provide a valid email.")

        send_registration_resubmit_notification(registration.id)

        self.session.refresh_from_db()
        self.assertEqual(self.session.flow, "REGISTRATION")
        self.assertEqual(self.session.current_step, "email")
        self.assertEqual(self.session.session_data["resubmit_registration_id"], registration.id)
        send_email_mock.assert_called_once()
        self.assertGreaterEqual(send_text_mock.call_count, 1)

    @patch("dulux_chatbot.warranty.tasks.EmailMultiAlternatives.send")
    @patch("dulux_chatbot.warranty.tasks.WhatsAppClient.send_text")
    def test_registration_resubmit_notification_uses_human_readable_field_labels(self, send_text_mock, send_email_mock):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.RESUBMIT)
        registration.rejection_fields.create(field_name="paint_pairs", note="Please update the selected paint details.")
        registration.rejection_fields.create(field_name="paint_pair_invoices", note="Please upload a clear invoice.")

        send_registration_resubmit_notification(registration.id)

        sent_messages = [call.args[1] for call in send_text_mock.call_args_list if len(call.args) >= 2]
        combined_text = "\n".join(sent_messages)
        self.assertIn("Paint Details", combined_text)
        self.assertIn("Invoice Photos", combined_text)
        self.assertNotIn("paint_pairs", combined_text)
        self.assertNotIn("paint_pair_invoices", combined_text)
        send_email_mock.assert_called_once()

    @patch("dulux_chatbot.warranty.tasks.EmailMultiAlternatives.send")
    @patch("dulux_chatbot.warranty.tasks.WhatsAppClient.send_text")
    def test_registration_resubmit_notification_maps_postal_code_label(self, send_text_mock, send_email_mock):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.RESUBMIT)
        registration.rejection_fields.create(field_name="postal_code", note="Please provide the postal code.")

        send_registration_resubmit_notification(registration.id)

        sent_messages = [call.args[1] for call in send_text_mock.call_args_list if len(call.args) >= 2]
        combined_text = "\n".join(sent_messages)
        self.assertIn("Postal code", combined_text)
        self.assertNotIn("postal_code", combined_text)
        self.session.refresh_from_db()
        self.assertEqual(self.session.current_step, "postal_code")
        send_email_mock.assert_called_once()

    def test_registration_resubmit_flow_updates_requested_fields_only(self):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.RESUBMIT)
        registration.rejection_fields.create(field_name="email", note="Please provide a valid email.")
        registration.rejection_fields.create(field_name="city", note="Please provide the correct city.")
        self.session.flow = "REGISTRATION"
        self.session.current_step = "email"
        self.session.session_data = {
            "customer_name": registration.customer_name,
            "email": registration.email,
            "city": registration.city,
            "province": registration.province,
            "site_address": registration.site_address,
            "purchase_date": registration.purchase_date.isoformat(),
            "purchase_dealer": registration.purchase_dealer,
            "purchase_dealer_city": registration.purchase_dealer_city,
            "purchase_dealer_address": registration.purchase_dealer_address,
            "paint_pairs": [],
            "paint_pair_invoices": [],
            "resubmit_registration_id": registration.id,
            "resubmit_steps": ["email", "city"],
            "resubmit_step_index": 0,
            "resubmit_notes": "Please update your details.",
        }
        self.session.save(update_fields=["flow", "current_step", "session_data", "modified"])

        self.dispatch_text("updated@example.com")
        self.assertEqual(self.session.current_step, "city")

        self.dispatch_text("Lahore")

        registration.refresh_from_db()
        self.assertEqual(registration.email, "updated@example.com")
        self.assertEqual(registration.city, "Lahore")
        self.assertEqual(registration.state, RegistrationState.SUBMITTED)
        self.assertFalse(registration.rejection_fields.exists())
        self.assertIsNone(self.session.flow)

    def test_registration_resubmit_flow_updates_postal_code(self):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.RESUBMIT)
        registration.rejection_fields.create(field_name="postal_code", note="Please provide the postal code.")
        self.session.flow = "REGISTRATION"
        self.session.current_step = "postal_code"
        self.session.session_data = {
            "postal_code": registration.postal_code,
            "paint_pairs": [],
            "paint_pair_invoices": [],
            "resubmit_registration_id": registration.id,
            "resubmit_steps": ["postal_code"],
            "resubmit_step_index": 0,
        }
        self.session.save(update_fields=["flow", "current_step", "session_data", "modified"])

        self.dispatch_text("54000")

        registration.refresh_from_db()
        self.assertEqual(registration.postal_code, "54000")
        self.assertEqual(registration.state, RegistrationState.SUBMITTED)
        self.assertIsNone(self.session.flow)

    def test_expired_resubmit_session_shows_fallback_message(self):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.RESUBMIT)
        self.session.flow = "REGISTRATION"
        self.session.current_step = "email"
        self.session.session_data = {"resubmit_registration_id": registration.id}
        self.session.save(update_fields=["flow", "current_step", "session_data", "modified"])

        WhatsAppSession.objects.filter(pk=self.session.pk).update(last_activity=timezone.now() - timedelta(minutes=6))
        self.session.refresh_from_db()

        self.dispatch_text("updated@example.com")

        self.assertIn("raise a complaint and live chat", self.client.text_messages[-2]["text"].lower())

    def test_registration_consent_no_returns_to_main_menu(self):
        self.dispatch_text("1")
        self.assertEqual(self.session.current_step, "consent")

        self.dispatch_text("NO")

        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertIn("Warranty Registration", self.client.text_messages[-1]["text"])

    def test_registration_consent_back_returns_to_main_menu(self):
        self.dispatch_text("1")
        self.assertEqual(self.session.current_step, "consent")

        self.dispatch_text("0")

        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertIn("Warranty Registration", self.client.text_messages[-1]["text"])

    def test_registration_consent_start_over_returns_to_main_menu(self):
        self.dispatch_text("1")
        self.assertEqual(self.session.current_step, "consent")

        self.dispatch_text("00")

        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertIn("Warranty Registration", self.client.text_messages[-1]["text"])

    def test_main_menu_command_takes_priority_over_registration_input(self):
        self.dispatch_text("1")
        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")
        self.dispatch_text("customer@example.com")
        self.dispatch_text("Karachi")
        self.dispatch_text("Sindh")
        self.dispatch_text("123 Street")

        self.assertEqual(self.session.current_step, "purchase_date")

        self.dispatch_text("00")

        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertEqual(self.session.session_data, {})
        self.assertIn("Warranty Registration", self.client.text_messages[-1]["text"])

    def test_numeric_commands_take_priority_over_claim_input(self):
        self.dispatch_text("2")
        self.assertEqual(self.session.current_step, "registration_lookup")

        self.dispatch_text("00")

        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertEqual(self.session.session_data, {})
        self.assertIn("Warranty Registration", self.client.text_messages[-1]["text"])

    def test_claim_flow_end_to_end(self):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)

        self.dispatch_text("2")
        self.assertEqual(self.session.current_step, "registration_lookup")

        self.dispatch_text(registration.registration_code)
        self.dispatch_text("1")
        self.assertIn("1. Peeling Or Cracking", self.client.text_messages[-1]["text"])
        self.dispatch_text("1")
        self.dispatch_text("100")
        self.dispatch_image("claim-media-1")
        self.dispatch_image("claim-media-2")
        self.dispatch_image("claim-media-3")

        claim = WarrantyClaim.objects.get(registration=registration)
        self.assertEqual(claim.paint_pair_id, paint_pair.id)
        self.assertEqual(claim.state, ClaimState.SUBMITTED)
        self.assertEqual(claim.images.count(), 3)
        self.assertIsNone(self.session.flow)
        self.assertIn("How can I assist you?", self.client.text_messages[-1]["text"])

    def test_claim_flow_image_prompt_includes_note(self):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        create_paint_pair(registration=registration)

        self.dispatch_text("2")
        self.dispatch_text(registration.registration_code)
        self.dispatch_text("1")
        self.dispatch_text("1")
        self.dispatch_text("100")

        self.assertIn("Note : Please add one Invoice image at a time", self.client.text_messages[-1]["text"])

    def test_claim_flow_final_submit_is_idempotent_for_duplicate_completion(self):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)

        self.session.flow = "CLAIM"
        self.session.current_step = "photo_alternate_angle"
        self.session.session_data = {
            "registration_id": registration.id,
            "paint_pair_id": paint_pair.id,
            "issue_type": IssueType.PEELING_CRACKING,
            "affected_area_sqft": "150",
            "images": [],
        }
        self.session.save(update_fields=["flow", "current_step", "session_data", "modified"])

        ClaimFlow(session=self.session, client=self.client).handle_complete({})

        self.session.refresh_from_db()
        self.session.flow = "CLAIM"
        self.session.current_step = "photo_alternate_angle"
        self.session.session_data = {
            "registration_id": registration.id,
            "paint_pair_id": paint_pair.id,
            "issue_type": IssueType.PEELING_CRACKING,
            "affected_area_sqft": "150",
            "images": [],
        }
        self.session.save(update_fields=["flow", "current_step", "session_data", "modified"])

        ClaimFlow(session=self.session, client=self.client).handle_complete({})

        self.assertEqual(WarrantyClaim.objects.filter(registration=registration, paint_pair=paint_pair).count(), 1)
        self.assertIn("A claim already exists for the selected paint pair.", self.client.text_messages[-1]["text"])

    def test_claim_flow_rejects_already_claimed_paint_pair(self):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        create_claim(registration=registration, paint_pair=paint_pair)

        self.dispatch_text("2")
        self.dispatch_text(registration.registration_code)
        self.dispatch_text("1")

        self.assertEqual(self.session.current_step, "paint_pair_select")
        self.assertIn(
            "A claim already exists for the selected paint pair.",
            self.client.text_messages[-1]["text"],
        )

    def test_claim_flow_allows_new_claim_when_previous_claim_was_rejected(self):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        create_claim(registration=registration, paint_pair=paint_pair, state=ClaimState.REJECTED)

        self.dispatch_text("2")
        self.dispatch_text(registration.registration_code)
        self.dispatch_text("1")

        self.assertEqual(self.session.current_step, "issue_type")
        self.assertIn("Please select the issue type:", self.client.text_messages[-1]["text"])

    def test_claim_flow_rejects_invalid_issue_type(self):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)

        self.dispatch_text("2")
        self.dispatch_text(registration.registration_code)
        self.dispatch_text("1")
        self.dispatch_text("INVALID_ISSUE")

        self.assertEqual(self.session.current_step, "issue_type")
        self.assertIn("Please select a valid issue type from the list below.", self.client.text_messages[-1]["text"])
        self.assertIn("1. Peeling Or Cracking", self.client.text_messages[-1]["text"])

    def test_claim_flow_rejects_invalid_affected_area(self):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)

        self.dispatch_text("2")
        self.dispatch_text(registration.registration_code)
        self.dispatch_text("1")
        self.dispatch_text(IssueType.PEELING_CRACKING)
        self.dispatch_text("-5")

        self.assertEqual(self.session.current_step, "affected_area")
        self.assertIn("valid positive area", self.client.text_messages[-1]["text"])

    @patch.object(send_find_product_results, "apply_async")
    def test_find_product_flow_end_to_end(self, mocked_send_find_product_results):
        product = create_product(name="Flow Product")
        surface_type = create_surface_type(environment="EXTERIOR")
        create_product_surface_mapping(product=product, surface_type=surface_type)
        attach_product_image(product=product)

        self.dispatch_text("3")
        self.assertEqual(self.session.current_step, "interior_exterior_select")

        self.dispatch_text("2")
        self.assertIn("1. ", self.client.text_messages[-1]["text"])
        self.dispatch_text("1")

        self.assertIsNone(self.session.flow)
        self.assertEqual(len(self.client.images), 0)
        self.assertNotIn("How can I assist you?", self.client.text_messages[-1]["text"])
        mocked_send_find_product_results.assert_called_once()
        self.assertEqual(mocked_send_find_product_results.call_args.kwargs["args"][0], self.phone_number)
        self.assertEqual(mocked_send_find_product_results.call_args.kwargs["args"][1], [product.id])
        self.assertIn("How can I assist you?", mocked_send_find_product_results.call_args.kwargs["args"][2])

    @patch.object(send_whatsapp_main_menu, "apply_async")
    @patch("dulux_chatbot.chatbot.tasks.WhatsAppClient")
    def test_find_product_results_task_sends_products_and_queues_main_menu(self, client_mock, mocked_send_main_menu):
        product = create_product(name="Flow Product")
        attach_product_image(product=product)

        send_find_product_results(self.phone_number, [product.id], "Main menu")

        client_mock.return_value.send_image.assert_called_once()
        self.assertEqual(client_mock.return_value.send_image.call_args.args[0], self.phone_number)
        self.assertIn("*Name:* Flow Product", client_mock.return_value.send_image.call_args.args[2])
        self.assertIn("*Features:* Durable finish", client_mock.return_value.send_image.call_args.args[2])
        self.assertIn("*Coverage details:* 100 sqft per liter", client_mock.return_value.send_image.call_args.args[2])
        self.assertIn("*URL:* https://example.com/products/test", client_mock.return_value.send_image.call_args.args[2])
        mocked_send_main_menu.assert_called_once_with(args=[self.phone_number, "Main menu"], countdown=2)

    def test_complaint_flow_end_to_end(self):
        self.dispatch_text("4")
        self.assertEqual(self.session.current_step, "subject")

        self.dispatch_text("Paint damaged")
        self.dispatch_text("The wall finish is damaged.")
        self.dispatch_image("complaint-media-1")
        self.dispatch_text("DONE")

        complaint = Complaint.objects.get(phone_number=self.phone_number)
        self.assertEqual(complaint.subject, "Paint damaged")
        self.assertEqual(complaint.images.count(), 1)
        self.assertEqual(complaint.messages.count(), 1)
        self.assertEqual(self.session.current_step, "chat")
        self.assertIn("they will go directly to customer support", self.client.text_messages[-1]["text"])
        self.assertIn("Write MAIN MENU", self.client.text_messages[-1]["text"])

        self.dispatch_text("Need an urgent update")
        self.assertEqual(ChatMessage.objects.filter(complaint=complaint).count(), 2)

        self.dispatch_image("complaint-chat-media-1")
        complaint.refresh_from_db()
        self.assertEqual(complaint.images.count(), 2)

    def test_complaint_chat_session_expires_after_24_hours(self):
        self.dispatch_text("4")
        self.dispatch_text("Paint damaged")
        self.dispatch_text("The wall finish is damaged.")
        self.dispatch_text("DONE")

        complaint = Complaint.objects.get(phone_number=self.phone_number)
        WhatsAppSession.objects.filter(pk=self.session.pk).update(
            last_activity=timezone.now() - timedelta(hours=23, minutes=59)
        )
        self.session.refresh_from_db()

        self.dispatch_text("Still need support")

        self.assertEqual(self.session.flow, "COMPLAINT")
        self.assertEqual(self.session.current_step, "chat")
        self.assertEqual(ChatMessage.objects.filter(complaint=complaint).count(), 2)

        WhatsAppSession.objects.filter(pk=self.session.pk).update(
            last_activity=timezone.now() - timedelta(hours=24, minutes=1)
        )
        self.session.refresh_from_db()

        self.dispatch_text("Still there?")

        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertIn("Warranty Registration", self.client.text_messages[-1]["text"])

    def test_complaint_chat_reminds_user_after_one_hour_gap(self):
        self.dispatch_text("4")
        self.dispatch_text("Paint damaged")
        self.dispatch_text("The wall finish is damaged.")
        self.dispatch_text("DONE")

        complaint = Complaint.objects.get(phone_number=self.phone_number)
        WhatsAppSession.objects.filter(pk=self.session.pk).update(last_activity=timezone.now() - timedelta(hours=2))
        self.session.refresh_from_db()

        self.dispatch_text("Still need support")

        self.assertEqual(self.session.flow, "COMPLAINT")
        self.assertEqual(ChatMessage.objects.filter(complaint=complaint).count(), 2)
        self.assertIn("subject: Paint damaged", self.client.text_messages[-1]["text"])
        self.assertIn("press 00 or type MAIN MENU", self.client.text_messages[-1]["text"])

    def test_main_menu_command_takes_priority_over_complaint_chat(self):
        self.dispatch_text("4")
        self.dispatch_text("Paint damaged")
        self.dispatch_text("The wall finish is damaged.")
        self.dispatch_text("DONE")

        complaint = Complaint.objects.get(phone_number=self.phone_number)
        self.dispatch_text("MAIN MENU")

        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertEqual(ChatMessage.objects.filter(complaint=complaint).count(), 1)
        self.assertIn("Warranty Registration", self.client.text_messages[-1]["text"])

    @patch("dulux_chatbot.chatbot.tasks.WhatsAppClient")
    def test_send_main_menu_task_resets_active_session(self, client_mock):
        self.session.flow = "COMPLAINT"
        self.session.current_step = "chat"
        self.session.session_data = {"complaint_id": 123}
        self.session.save(update_fields=["flow", "current_step", "session_data", "modified"])

        send_whatsapp_main_menu(self.phone_number, "Main menu")

        self.session.refresh_from_db()
        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertEqual(self.session.session_data, {})
        client_mock.return_value.send_text.assert_called_once_with(self.phone_number, "Main menu")

    @patch.object(send_whatsapp_main_menu, "apply_async")
    def test_reissuance_flow_end_to_end(self, mocked_send_main_menu):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        registration.warranty_certificate.save(
            "certificate.txt",
            ContentFile(b"certificate-content", name="certificate.txt"),
            save=True,
        )

        self.dispatch_text("5")
        self.assertEqual(self.session.current_step, "phone_lookup")

        self.dispatch_text(self.phone_number)

        self.assertIsNone(self.session.flow)
        self.assertEqual(len(self.client.documents), 1)
        self.assertEqual(self.client.documents[0]["filename"], "warranty_certificate.pdf")
        self.assertIn(
            "Please wait while we send your selected warranty certificate.", self.client.text_messages[-1]["text"]
        )
        mocked_send_main_menu.assert_called_once()
        self.assertEqual(mocked_send_main_menu.call_args.kwargs["countdown"], 2)
        self.assertEqual(mocked_send_main_menu.call_args.kwargs["args"][0], self.phone_number)
        self.assertIn("How can I assist you?", mocked_send_main_menu.call_args.kwargs["args"][1])

    def test_claim_flow_success_message_uses_registration_number(self):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        topcoat = create_product(name="Claim Flow Topcoat")
        paint_pair = create_paint_pair(registration=registration, topcoat=topcoat)

        self.dispatch_text("2")
        self.assertEqual(self.session.current_step, "registration_lookup")

        self.dispatch_text(registration.registration_code)
        self.dispatch_text("1")
        self.dispatch_text("1")
        self.dispatch_text("120")
        self.dispatch_image("claim-long-shot")
        self.dispatch_image("claim-close-shot")
        self.dispatch_image("claim-alt-shot")

        claim = WarrantyClaim.objects.get(registration=registration, paint_pair=paint_pair)
        self.assertIn(
            f"Claim submitted successfully for Registration number: {registration.registration_code}",
            self.client.text_messages[-2]["text"],
        )
        self.assertIn("How can I assist you?", self.client.text_messages[-1]["text"])
        self.assertEqual(claim.registration.registration_code, registration.registration_code)

    @patch.object(send_whatsapp_main_menu, "apply_async")
    def test_reissuance_flow_generates_and_sends_certificate_when_missing(self, mocked_send_main_menu):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        create_paint_pair(registration=registration)

        self.dispatch_text("5")
        self.dispatch_text(self.phone_number)

        registration.refresh_from_db()
        self.assertTrue(bool(registration.warranty_certificate))
        self.assertIsNone(self.session.flow)
        self.assertEqual(len(self.client.documents), 1)
        self.assertEqual(self.client.documents[0]["filename"], "warranty_certificate.pdf")
        self.assertIn(
            "Please wait while we send your selected warranty certificate.", self.client.text_messages[-1]["text"]
        )
        mocked_send_main_menu.assert_called_once()
        self.assertEqual(mocked_send_main_menu.call_args.kwargs["countdown"], 2)
        self.assertEqual(mocked_send_main_menu.call_args.kwargs["args"][0], self.phone_number)
        self.assertIn("How can I assist you?", mocked_send_main_menu.call_args.kwargs["args"][1])

    def test_reissuance_flow_normalizes_local_phone_number_to_ninety_two_format(self):
        registration = create_registration(phone_number="923001234567", state=RegistrationState.APPROVED)
        registration.warranty_certificate.save(
            "certificate.txt",
            ContentFile(b"certificate-content", name="certificate.txt"),
            save=True,
        )

        self.dispatch_text("5")
        self.dispatch_text("03001234567")

        self.assertIsNone(self.session.flow)
        self.assertEqual(len(self.client.documents), 1)
        self.assertEqual(self.client.documents[0]["filename"], "warranty_certificate.pdf")

    def test_reissuance_flow_rejects_invalid_phone_number_format(self):
        self.dispatch_text("5")
        self.dispatch_text("12345")

        self.assertEqual(self.session.flow, "REISSUANCE")
        self.assertEqual(self.session.current_step, "phone_lookup")
        self.assertIn(
            "Please provide a valid phone number in 92XXXXXXXXXX format.",
            self.client.text_messages[-1]["text"],
        )

    def test_reissuance_flow_prompts_for_selection_when_multiple_registrations_exist(self):
        first_registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        second_registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)

        self.dispatch_text("5")
        self.dispatch_text(self.phone_number)

        self.assertEqual(self.session.flow, "REISSUANCE")
        self.assertEqual(self.session.current_step, "registration_select")
        self.assertIn(first_registration.registration_code, self.client.text_messages[-1]["text"])
        self.assertIn(second_registration.registration_code, self.client.text_messages[-1]["text"])
        self.assertIn(first_registration.purchase_date.strftime("%d/%m/%Y"), self.client.text_messages[-1]["text"])

    @patch.object(send_whatsapp_main_menu, "apply_async")
    def test_reissuance_flow_sends_selected_certificate_when_multiple_registrations_exist(self, mocked_send_main_menu):
        older_registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        older_registration.warranty_certificate.save(
            "older_certificate.pdf",
            ContentFile(b"older-certificate", name="older_certificate.pdf"),
            save=True,
        )
        newer_registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        newer_registration.warranty_certificate.save(
            "newer_certificate.pdf",
            ContentFile(b"newer-certificate", name="newer_certificate.pdf"),
            save=True,
        )

        self.dispatch_text("5")
        self.dispatch_text(self.phone_number)
        self.dispatch_text("2")

        self.assertIsNone(self.session.flow)
        self.assertEqual(len(self.client.documents), 1)
        self.assertIn("older_certificate", self.client.documents[0]["document_url"])
        self.assertIn(
            "Please wait while we send your selected warranty certificate.", self.client.text_messages[-1]["text"]
        )
        mocked_send_main_menu.assert_called_once()
        self.assertEqual(mocked_send_main_menu.call_args.kwargs["countdown"], 2)
        self.assertEqual(mocked_send_main_menu.call_args.kwargs["args"][0], self.phone_number)
        self.assertIn("How can I assist you?", mocked_send_main_menu.call_args.kwargs["args"][1])

    def test_reissuance_flow_rejects_invalid_registration_selection(self):
        create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)

        self.dispatch_text("5")
        self.dispatch_text(self.phone_number)
        self.dispatch_text("9")

        self.assertEqual(self.session.flow, "REISSUANCE")
        self.assertEqual(self.session.current_step, "registration_select")
        self.assertIn("Please select a valid registration option.", self.client.text_messages[-1]["text"])

    def test_back_command_moves_to_previous_step(self):
        self.dispatch_text("1")
        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")

        self.assertEqual(self.session.current_step, "email")

        self.dispatch_text("0")

        self.assertEqual(self.session.current_step, "name")

    def test_main_menu_command_resets_active_flow(self):
        self.dispatch_text("4")
        self.dispatch_text("Paint damaged")

        self.dispatch_text("00")

        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertEqual(self.session.session_data, {})
        self.assertIn("Warranty Registration", self.client.text_messages[-1]["text"])

    def test_expired_session_returns_to_main_menu(self):
        self.dispatch_text("1")
        self.dispatch_text("YES")

        self.assertEqual(self.session.flow, "REGISTRATION")
        self.assertEqual(self.session.current_step, "name")

        WhatsAppSession.objects.filter(pk=self.session.pk).update(last_activity=timezone.now() - timedelta(minutes=6))
        self.session.refresh_from_db()

        self.dispatch_text("Customer Name")

        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertEqual(self.session.session_data, {})
        self.assertIn("Warranty Registration", self.client.text_messages[-1]["text"])
