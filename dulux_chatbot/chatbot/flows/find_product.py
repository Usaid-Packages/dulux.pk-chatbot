from dulux_chatbot.chatbot.flows.base import BaseFlow
from dulux_chatbot.products.models import Product, SurfaceType


class FindProductFlow(BaseFlow):
    initial_step = "interior_exterior_select"

    def prompt_interior_exterior_select(self) -> None:
        self._send_step_prompt("Please reply with INTERIOR or EXTERIOR.")

    def prompt_surface_type_select(self) -> None:
        environment = (self.session.session_data or {}).get("environment")
        if not environment:
            self._send_step_prompt("Please choose INTERIOR or EXTERIOR first.")
            return

        surface_types = list(SurfaceType.objects.filter(environment=environment).order_by("name"))
        if not surface_types:
            self.client.send_text(
                self.session.phone_number, "No surface types are configured for the selected environment."
            )
            self._reset()
            return

        option_map = {}
        option_lines = ["Please select a surface type:"]
        for index, surface_type in enumerate(surface_types, start=4):
            option_key = str(index)
            option_map[option_key] = surface_type.id
            option_lines.append(f"{option_key}. {surface_type.name}")

        self._save_data("surface_type_options", option_map)
        self._send_step_prompt("\n".join(option_lines))

    def handle_interior_exterior_select(self, message: dict) -> None:
        environment = self._get_text(message).upper()
        if environment not in {"INTERIOR", "EXTERIOR"}:
            self.prompt_interior_exterior_select()
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
            self.client.send_text(self.session.phone_number, "Please select a valid surface type option.")
            return

        surface_type_id = option_map.get(selected_option)
        if surface_type_id is None:
            self.client.send_text(self.session.phone_number, "Please select a valid surface type option.")
            return

        surface_type = SurfaceType.objects.filter(pk=surface_type_id, environment=environment).first()
        if surface_type is None:
            self.client.send_text(self.session.phone_number, "Surface type not found for the selected environment.")
            return
        self._save_data("surface_type_id", surface_type.id)
        self.handle_result(message)

    def handle_result(self, _message: dict) -> None:
        surface_type_id = (self.session.session_data or {}).get("surface_type_id")
        products = Product.objects.filter(
            surface_mappings__surface_type_id=surface_type_id, is_active=True
        ).prefetch_related("images__image")
        if not products.exists():
            self.client.send_text(self.session.phone_number, "No products found for the selected surface type.")
            self._reset()
            return
        for product in products:
            self.client.send_text(
                self.session.phone_number,
                f"{product.name}\n{product.features}\n{product.coverage_details}\n{product.webpage_url}",
            )
            for product_image in product.images.all():
                self.client.send_document(
                    self.session.phone_number,
                    product_image.image.image.url,
                    f"{product.name}.jpg",
                    product.name,
                )
        self._reset()
