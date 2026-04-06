from datetime import date, timedelta
from uuid import uuid4

from django.core.files.base import ContentFile
from django.test import TestCase

from dulux_chatbot.chatbot.handlers.dispatcher import dispatch
from dulux_chatbot.chatbot.models import WhatsAppSession
from dulux_chatbot.complaints.models import ChatMessage, Complaint
from dulux_chatbot.products.tests.factories import (
    attach_product_image,
    create_product,
    create_product_surface_mapping,
    create_surface_type,
)
from dulux_chatbot.warranty.choices import ClaimState, InvoiceType, IssueType, RegistrationState
from dulux_chatbot.warranty.models import PaintPairInvoice, WarrantyClaim, WarrantyRegistration
from dulux_chatbot.warranty.tests.factories import create_paint_pair, create_registration


class DummyClient:
    def __init__(self):
        self.text_messages = []
        self.documents = []
        self.downloaded_media_ids = []

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

    def download_media(self, media_id: str) -> bytes:
        self.downloaded_media_ids.append(media_id)
        return b"fake-image-bytes"


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

    def test_registration_flow_end_to_end(self):
        topcoat = create_product(name="Flow Topcoat")
        basecoat = create_product(name="Flow Basecoat", product_type="BASECOAT", warranty_years=3)

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
        self.dispatch_text(topcoat.name)
        self.dispatch_text("10.00")
        self.dispatch_text(basecoat.name)
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
        self.dispatch_text("Flow Topcoat")
        self.dispatch_text("10.00")
        self.dispatch_text("SKIP")
        self.dispatch_text("NO")

        self.assertEqual(self.session.current_step, "invoice_upload")
        self.dispatch_text("DONE")
        self.assertEqual(self.session.flow, "REGISTRATION")
        self.assertEqual(self.session.current_step, "invoice_upload")
        self.assertIn("At least one invoice image is required", self.client.text_messages[-1]["text"])

    def test_registration_rejects_invalid_email_before_advancing(self):
        self.dispatch_text("1")
        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")
        self.dispatch_text("invalid-email")

        self.assertEqual(self.session.current_step, "email")
        self.assertIn("Please provide a valid email address.", self.client.text_messages[-1]["text"])

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
        self.dispatch_text("Flow Topcoat")
        self.dispatch_text("10.00")
        self.dispatch_text("SKIP")
        self.dispatch_text("NO")

        self.dispatch_document("invoice-doc-1")

        self.assertEqual(self.session.current_step, "invoice_upload")
        self.assertEqual(self.client.downloaded_media_ids, [])
        self.assertIn("Please upload an image file for the invoice.", self.client.text_messages[-1]["text"])

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

        self.dispatch_text("1")

        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertIn("Warranty Registration", self.client.text_messages[-1]["text"])

    def test_registration_consent_start_over_returns_to_main_menu(self):
        self.dispatch_text("1")
        self.assertEqual(self.session.current_step, "consent")

        self.dispatch_text("2")

        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertIn("Warranty Registration", self.client.text_messages[-1]["text"])

    def test_numeric_commands_take_priority_over_registration_input(self):
        self.dispatch_text("1")
        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")
        self.dispatch_text("customer@example.com")
        self.dispatch_text("Karachi")
        self.dispatch_text("Sindh")
        self.dispatch_text("123 Street")

        self.assertEqual(self.session.current_step, "purchase_date")

        self.dispatch_text("2")

        self.assertEqual(self.session.flow, "REGISTRATION")
        self.assertEqual(self.session.current_step, "consent")
        self.assertEqual(self.session.session_data, {})

    def test_numeric_commands_take_priority_over_claim_input(self):
        self.dispatch_text("2")
        self.assertEqual(self.session.current_step, "registration_lookup")

        self.dispatch_text("3")

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
        self.dispatch_text(paint_pair.topcoat.name)
        self.dispatch_text(IssueType.PEELING_CRACKING)
        self.dispatch_text("100")
        self.dispatch_image("claim-media-1")
        self.dispatch_image("claim-media-2")
        self.dispatch_image("claim-media-3")

        claim = WarrantyClaim.objects.get(registration=registration)
        self.assertEqual(claim.paint_pair_id, paint_pair.id)
        self.assertEqual(claim.state, ClaimState.SUBMITTED)
        self.assertEqual(claim.images.count(), 3)
        self.assertIsNone(self.session.flow)

    def test_claim_flow_rejects_invalid_issue_type(self):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)

        self.dispatch_text("2")
        self.dispatch_text(registration.registration_code)
        self.dispatch_text(paint_pair.topcoat.name)
        self.dispatch_text("INVALID_ISSUE")

        self.assertEqual(self.session.current_step, "issue_type")
        self.assertIn("valid issue type", self.client.text_messages[-1]["text"])

    def test_claim_flow_rejects_invalid_affected_area(self):
        registration = create_registration(phone_number=self.phone_number, state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)

        self.dispatch_text("2")
        self.dispatch_text(registration.registration_code)
        self.dispatch_text(paint_pair.topcoat.name)
        self.dispatch_text(IssueType.PEELING_CRACKING)
        self.dispatch_text("-5")

        self.assertEqual(self.session.current_step, "affected_area")
        self.assertIn("valid positive area", self.client.text_messages[-1]["text"])

    def test_find_product_flow_end_to_end(self):
        product = create_product(name="Flow Product")
        surface_type = create_surface_type(environment="EXTERIOR")
        create_product_surface_mapping(product=product, surface_type=surface_type)
        attach_product_image(product=product)

        self.dispatch_text("3")
        self.assertEqual(self.session.current_step, "interior_exterior_select")

        self.dispatch_text("EXTERIOR")
        self.assertIn("4. ", self.client.text_messages[-1]["text"])
        self.dispatch_text("4")

        self.assertIsNone(self.session.flow)
        self.assertTrue(any(product.name in item["text"] for item in self.client.text_messages))
        self.assertEqual(len(self.client.documents), 1)

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

        self.dispatch_text("Need an urgent update")
        self.assertEqual(ChatMessage.objects.filter(complaint=complaint).count(), 2)

    def test_reissuance_flow_end_to_end(self):
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

    def test_back_command_moves_to_previous_step(self):
        self.dispatch_text("1")
        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")

        self.assertEqual(self.session.current_step, "email")

        self.dispatch_text("1")

        self.assertEqual(self.session.current_step, "name")

    def test_restart_command_resets_flow_to_initial_step(self):
        self.dispatch_text("1")
        self.dispatch_text("YES")
        self.dispatch_text("Customer Name")

        self.dispatch_text("2")

        self.assertEqual(self.session.flow, "REGISTRATION")
        self.assertEqual(self.session.current_step, "consent")
        self.assertEqual(self.session.session_data, {})

    def test_main_menu_command_resets_active_flow(self):
        self.dispatch_text("4")
        self.dispatch_text("Paint damaged")

        self.dispatch_text("3")

        self.assertIsNone(self.session.flow)
        self.assertEqual(self.session.current_step, "menu")
        self.assertEqual(self.session.session_data, {})
        self.assertIn("Warranty Registration", self.client.text_messages[-1]["text"])
