from django.db import IntegrityError
from django.test import TestCase

from dulux_chatbot.warranty.choices import InvoiceType, PhotoType, RegistrationState
from dulux_chatbot.warranty.helpers import generate_registration_code
from dulux_chatbot.warranty.tests.factories import (
    create_claim,
    create_claim_image,
    create_paint_pair,
    create_paint_pair_invoice,
    create_registration,
)


class WarrantyUtilsTests(TestCase):
    def test_generate_registration_code_returns_unique_ten_digit_value(self):
        code = generate_registration_code()

        self.assertEqual(len(code), 10)
        self.assertTrue(code.isdigit())


class WarrantyRegistrationModelTests(TestCase):
    def test_save_auto_generates_registration_code(self):
        registration = create_registration()

        self.assertEqual(len(registration.registration_code), 10)

    def test_phone_number_allows_multiple_registrations(self):
        first_registration = create_registration(phone_number="923001111111")
        second_registration = create_registration(phone_number="923001111111")

        self.assertNotEqual(first_registration.registration_code, second_registration.registration_code)


class InvoiceModelTests(TestCase):
    def test_registration_invoice_allows_multiple_invoices_per_type(self):
        registration = create_registration()

        create_paint_pair_invoice(registration=registration, invoice_type=InvoiceType.TOPCOAT)
        create_paint_pair_invoice(registration=registration, invoice_type=InvoiceType.TOPCOAT)

        self.assertEqual(registration.invoices.count(), 2)


class WarrantyClaimModelTests(TestCase):
    def test_claim_image_requires_unique_photo_type_per_claim(self):
        registration = create_registration(state=RegistrationState.APPROVED)
        paint_pair = create_paint_pair(registration=registration)
        claim = create_claim(registration=registration, paint_pair=paint_pair)
        create_claim_image(claim=claim, photo_type=PhotoType.LONG_SHOT)

        with self.assertRaises(IntegrityError):
            create_claim_image(claim=claim, photo_type=PhotoType.LONG_SHOT)
