from dulux_chatbot.chatbot.flows.base import BaseFlow
from dulux_chatbot.chatbot.tasks import send_whatsapp_main_menu
from dulux_chatbot.products.models import Product, SurfaceType


class FindProductFlow(BaseFlow):
    initial_step = "interior_exterior_select"

    @staticmethod
    def _format_product_message(*, product: Product) -> str:
        return (
            f"*Name:* {product.name}\n"
            f"*Features:* {product.features}\n"
            f"*Coverage details:* {product.coverage_details}\n"
            f"*URL:* {product.webpage_url}"
        )

    def prompt_interior_exterior_select(self) -> None:
        self._send_step_prompt("Please reply with 1 for INTERIOR or 2 for EXTERIOR.")

    def prompt_surface_type_select(self) -> None:
        environment = (self.session.session_data or {}).get("environment")
        if not environment:
            self._send_step_prompt("Please choose INTERIOR or EXTERIOR first.")
            return

        surface_types = list(SurfaceType.objects.filter(environment=environment).order_by("name"))
        if not surface_types:
            self._send_validation_error("No surface types are configured for the selected environment.")
            self._reset()
            return

        option_lines = self._build_choice_lines(surface_types)
        self._set_choice_options(
            "surface_type_options",
            [(option, surface_type_id) for option, surface_type_id, _ in option_lines],
        )
        prompt_lines = ["Please select a surface type:"]
        prompt_lines.extend(f"{option}. {label}" for option, _, label in option_lines)
        self._send_step_prompt("\n".join(prompt_lines))

    def handle_interior_exterior_select(self, message: dict) -> None:
        environment_value = self._get_text(message)
        environment_map = {
            "1": "INTERIOR",
            "2": "EXTERIOR",
            "INTERIOR": "INTERIOR",
            "EXTERIOR": "EXTERIOR",
        }
        environment = environment_map.get(environment_value.upper(), environment_map.get(environment_value))
        if environment not in {"INTERIOR", "EXTERIOR"}:
            self._send_validation_error("Please select 1 for INTERIOR or 2 for EXTERIOR.")
            return
        self._save_data("environment", environment)
        self.prompt_surface_type_select()
        self._advance_to("surface_type_select")

    def handle_surface_type_select(self, message: dict) -> None:
        session_data = self.session.session_data or {}
        environment = session_data.get("environment")
        option_map = session_data.get("surface_type_options") or {}
        selected_option = self._get_text(message)

        if not selected_option:
            self._send_validation_error("Please select a valid surface type option.")
            return

        surface_type_id = option_map.get(selected_option)
        if surface_type_id is None:
            self._send_validation_error("Please select a valid surface type option.")
            return

        surface_type = SurfaceType.objects.filter(pk=surface_type_id, environment=environment).first()
        if surface_type is None:
            self._send_validation_error("Surface type not found for the selected environment.")
            return
        self._save_data("surface_type_id", surface_type.id)
        self.handle_result(message)

    # TODO(audit P1-4 Important): Loops over every matching product and calls
    # client.send_image/send_text synchronously inside the webhook POST. A popular
    # surface with 20+ products = 20 blocking Meta HTTP calls before the view
    # returns; Meta's retry timeout fires, webhook is replayed, customer gets
    # duplicates, and rate-limit errors pile up. Combined with the per-phone
    # session lock (C3), this would hold the lock for the full fan-out duration.
    # Queue a Celery task that iterates and sends, then return from the webhook
    # immediately. See warranty/tasks.py for the apply_async pattern already used.
    def handle_result(self, _message: dict) -> None:
        surface_type_id = (self.session.session_data or {}).get("surface_type_id")
        products = list(
            Product.objects.filter(surface_mappings__surface_type_id=surface_type_id, is_active=True)
            .prefetch_related("images__image")
            .order_by("name")
        )
        if not products:
            self.client.send_text(self.session.phone_number, "No products found for the selected surface type.")
            self._reset()
            self._send_main_menu_message()
            return
        for product in products:
            product_message = self._format_product_message(product=product)
            product_image = next(iter(product.images.all()), None)
            if product_image is not None:
                self.client.send_image(
                    self.session.phone_number,
                    product_image.image.image.url,
                    product_message,
                )
            else:
                self.client.send_text(self.session.phone_number, product_message)
        self._reset()
        send_whatsapp_main_menu.apply_async(args=[self.session.phone_number, self.MAIN_MENU_TEXT], countdown=2)
