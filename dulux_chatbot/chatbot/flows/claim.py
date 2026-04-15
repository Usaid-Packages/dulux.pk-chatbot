from django.db import transaction

from dulux_chatbot.chatbot.flows.base import BaseFlow
from dulux_chatbot.chatbot.models import WhatsAppSession
from dulux_chatbot.warranty.choices import ClaimState, IssueType, PhotoType, RegistrationState
from dulux_chatbot.warranty.models import ClaimImage, RegistrationPaintPair, WarrantyClaim, WarrantyRegistration


class ClaimFlow(BaseFlow):
    initial_step = "registration_lookup"
    BLOCKING_CLAIM_STATES = (
        ClaimState.SUBMITTED,
        ClaimState.IN_REVIEW,
        ClaimState.QA_REVIEW,
        ClaimState.QA_APPROVED,
        ClaimState.QA_REJECTED,
        ClaimState.RESUBMIT,
        ClaimState.APPROVED,
    )
    ISSUE_TYPE_OPTIONS = [
        ("1", IssueType.PEELING_CRACKING),
        ("2", IssueType.COLOR_FADING),
        ("3", IssueType.ALGAE_FUNGUS),
        ("4", IssueType.WATER_INGRESS),
        ("5", IssueType.COVERAGE_VARIANCE),
        ("6", IssueType.NON_UNIFORM_FINISH),
        ("7", IssueType.OTHERS),
    ]

    def prompt_registration_lookup(self) -> None:
        self._send_step_prompt("Please share the registration code for the claim.")

    def prompt_paint_pair_select(self) -> None:
        registration_id = (self.session.session_data or {}).get("registration_id")
        paint_pairs = list(
            RegistrationPaintPair.objects.select_related("topcoat")
            .filter(registration_id=registration_id)
            .order_by("topcoat__name", "id")
        )
        if not paint_pairs:
            self._send_validation_error("No paint pairs were found for the selected registration.")
            return
        option_lines = [
            (str(index), paint_pair.id, paint_pair.topcoat.name)
            for index, paint_pair in enumerate(paint_pairs, start=1)
        ]
        self._set_choice_options(
            "claim_paint_pair_options", [(option, paint_pair_id) for option, paint_pair_id, _ in option_lines]
        )
        prompt_lines = ["Please select the topcoat product for the claim:"]
        prompt_lines.extend(f"{option}. {label}" for option, _, label in option_lines)
        self._send_step_prompt("\n".join(prompt_lines))

    def prompt_issue_type(self, error_message: str = "") -> None:
        lines = []
        if error_message:
            lines.append(error_message)
            lines.append("")
        lines.append("Please select the issue type:")
        lines.extend(f"{option}. {issue_type.label}" for option, issue_type in self.ISSUE_TYPE_OPTIONS)
        self._send_step_prompt("\n".join(lines))

    def prompt_affected_area(self) -> None:
        self._send_step_prompt("Please share the affected area in square feet.")

    def prompt_photo_long_shot(self) -> None:
        self._send_step_prompt(self._with_image_upload_note("Please upload the long shot image."))

    def prompt_photo_close_shot(self) -> None:
        self._send_step_prompt(self._with_image_upload_note("Please upload the close shot image."))

    def prompt_photo_alternate_angle(self) -> None:
        self._send_step_prompt(self._with_image_upload_note("Please upload the alternate angle image."))

    def handle_registration_lookup(self, message: dict) -> None:
        code = self._get_text(message)
        if not code:
            self._send_validation_error("Please share a valid registration code.")
            return
        registration = WarrantyRegistration.objects.filter(registration_code=code).first()
        if registration is None or registration.state != RegistrationState.APPROVED:
            self._send_validation_error("Approved registration not found.")
            return
        self._save_data("registration_id", registration.id)
        self.prompt_paint_pair_select()
        self._advance_to("paint_pair_select")

    def handle_paint_pair_select(self, message: dict) -> None:
        registration_id = (self.session.session_data or {}).get("registration_id")
        paint_pair_id = self._get_choice_value("claim_paint_pair_options", self._get_text(message))
        if paint_pair_id is None:
            self.prompt_paint_pair_select()
            return
        paint_pair = (
            RegistrationPaintPair.objects.select_related("topcoat")
            .filter(
                registration_id=registration_id,
                id=paint_pair_id,
            )
            .first()
        )
        if paint_pair is None:
            self.prompt_paint_pair_select()
            return
        if WarrantyClaim.objects.filter(
            registration_id=registration_id,
            paint_pair=paint_pair,
            state__in=self.BLOCKING_CLAIM_STATES,
        ).exists():
            self._send_validation_error("A claim already exists for the selected paint pair.")
            return
        self._save_data("paint_pair_id", paint_pair.id)
        self.prompt_issue_type()
        self._advance_to("issue_type")

    def handle_issue_type(self, message: dict) -> None:
        issue_type_input = self._get_text(message).upper()
        issue_type_map = {option: issue_type for option, issue_type in self.ISSUE_TYPE_OPTIONS}
        issue_type = issue_type_map.get(issue_type_input, issue_type_input)
        if issue_type not in IssueType.values:
            self.prompt_issue_type("Please select a valid issue type from the list below.")
            return
        self._save_data("issue_type", issue_type)
        self.prompt_affected_area()
        self._advance_to("affected_area")

    def handle_affected_area(self, message: dict) -> None:
        affected_area = self._normalize_numeric_input(self._get_text(message))
        try:
            if float(affected_area) <= 0:
                raise ValueError
        except ValueError:
            self._send_validation_error("Please share a valid positive area.")
            return
        self._save_data("affected_area_sqft", affected_area)
        self.prompt_photo_long_shot()
        self._advance_to("photo_long_shot")

    def handle_photo_long_shot(self, message: dict) -> None:
        self._handle_photo_step(
            message,
            step="photo_close_shot",
            photo_type=PhotoType.LONG_SHOT,
            prompt=self._with_image_upload_note("Please upload the close shot image."),
        )

    def handle_photo_close_shot(self, message: dict) -> None:
        self._handle_photo_step(
            message,
            step="photo_alternate_angle",
            photo_type=PhotoType.CLOSE_SHOT,
            prompt=self._with_image_upload_note("Please upload the alternate angle image."),
        )

    def handle_photo_alternate_angle(self, message: dict) -> None:
        media_id = self._get_media_id(message)
        if not media_id:
            self._send_validation_error("Please upload an image.")
            return
        if not self._is_supported_media_type(message):
            self._send_validation_error("File format not supported. Please upload an image.")
            return
        image = self._save_media_image(media_id, filename_prefix="claim")
        self._append_data("images", {"image_id": image.id, "photo_type": PhotoType.ALTERNATE_ANGLE})
        self.handle_complete(message)

    def _handle_photo_step(self, message: dict, *, step: str, photo_type: str, prompt: str) -> None:
        media_id = self._get_media_id(message)
        if not media_id:
            self._send_validation_error("Please upload an image.")
            return
        if not self._is_supported_media_type(message):
            self._send_validation_error("File format not supported. Please upload an image.")
            return
        image = self._save_media_image(media_id, filename_prefix="claim")
        self._append_data("images", {"image_id": image.id, "photo_type": photo_type})
        self._send_step_prompt(prompt)
        self._advance_to(step)

    # TODO(audit P1-6 Important): State is written twice — once on locked_session
    # (DB save), then mirrored manually onto self.session (in-memory only). Adding
    # a new field means remembering to mirror in both places; easy to forget and
    # silently desync. The early-exit branch at ~L194 updates self.session but
    # does NOT save it, so caller sees a mid-transaction view. Replace the mirror
    # with `self.session.refresh_from_db(fields=[...])` after each locked save,
    # or just use locked_session as the source of truth and re-point self.session.
    @transaction.atomic
    def handle_complete(self, _message: dict) -> None:
        locked_session = WhatsAppSession.objects.select_for_update().get(pk=self.session.pk)
        data = locked_session.session_data or {}
        if data.get("claim_submission_completed"):
            return

        registration_id = data.get("registration_id")
        paint_pair_id = data.get("paint_pair_id")
        if WarrantyClaim.objects.filter(
            registration_id=registration_id,
            paint_pair_id=paint_pair_id,
            state__in=self.BLOCKING_CLAIM_STATES,
        ).exists():
            locked_session.flow = None
            locked_session.current_step = "menu"
            locked_session.session_data = {}
            locked_session.save(update_fields=["flow", "current_step", "session_data", "modified"])
            self.session.flow = None
            self.session.current_step = "menu"
            self.session.session_data = {}
            self._send_validation_error("A claim already exists for the selected paint pair.")
            return

        data["claim_submission_completed"] = True
        locked_session.session_data = data
        locked_session.save(update_fields=["session_data", "modified"])
        self.session.session_data = data

        claim = WarrantyClaim.objects.create(
            registration_id=registration_id,
            paint_pair_id=paint_pair_id,
            issue_type=data.get("issue_type", ""),
            # TODO(audit P1-10 Suggestion): Default "0" silently produces an invalid
            # zero-area claim if upstream session_data lost the key. Flow-level
            # validation already requires area > 0 — at completion time, a missing
            # key means a bug upstream. Let it KeyError loudly instead of papering
            # over with bad data: use `data["affected_area_sqft"]`.
            affected_area_sqft=data.get("affected_area_sqft", "0"),
            notes="",
        )
        for image_data in data.get("images", []):
            ClaimImage.objects.create(claim=claim, image_id=image_data["image_id"], photo_type=image_data["photo_type"])
        self.client.send_text(
            self.session.phone_number,
            f"Claim submitted successfully for Registration number: {claim.registration.registration_code}",
        )
        locked_session.flow = None
        locked_session.current_step = "menu"
        locked_session.session_data = {}
        locked_session.save(update_fields=["flow", "current_step", "session_data", "modified"])
        self.session.flow = None
        self.session.current_step = "menu"
        self.session.session_data = {}
        self._send_main_menu_message()
