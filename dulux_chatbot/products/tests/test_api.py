from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.tests.factories import (
    attach_product_image,
    create_admin_user,
    create_cs_user,
    create_image,
    create_product,
    create_product_basecoat,
    create_product_surface_mapping,
    create_surface_type,
)


class ProductAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.list_url = reverse("product_list_create")
        self.admin_user = create_admin_user()
        self.cs_user = create_cs_user()

    def test_unauthenticated_get_returns_401(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_get_returns_paginated_products_with_images(self):
        product = create_product(name="Dulux Velvet Touch")
        basecoat = create_product(name="Dulux Primer Coat", product_type=ProductType.BASECOAT, warranty_years=3)
        surface_type = create_surface_type()
        create_product_surface_mapping(product=product, surface_type=surface_type)
        create_product_basecoat(topcoat=product, basecoat=basecoat)
        attach_product_image(product=product)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 2)
        result = next(item for item in response.data["results"] if item["id"] == product.id)
        self.assertEqual(result["name"], "Dulux Velvet Touch")
        self.assertEqual(len(result["images"]), 1)
        self.assertIn("image", result["images"][0])
        self.assertIn("url", result["images"][0]["image"])
        self.assertEqual(len(result["surface_types"]), 1)
        self.assertEqual(result["surface_types"][0]["id"], surface_type.id)
        self.assertEqual(len(result["basecoats"]), 1)
        self.assertEqual(result["basecoats"][0]["id"], basecoat.id)

    def test_filter_by_product_type_and_active_state(self):
        create_product(name="Active Topcoat", product_type=ProductType.TOPCOAT, warranty_years=6, is_active=True)
        create_product(name="Inactive Basecoat", product_type=ProductType.BASECOAT, warranty_years=3, is_active=False)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(self.list_url, {"product_type": ProductType.BASECOAT, "is_active": False})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Inactive Basecoat")

    def test_warranty_option_list_only_returns_active_products_with_warranty_years(self):
        topcoat = create_product(name="Warranty Option Topcoat", warranty_years=5, is_active=True)
        linked_basecoat = create_product(
            name="Warranty Option Basecoat",
            product_type=ProductType.BASECOAT,
            warranty_years=3,
            is_active=True,
        )
        create_product(name="Zero Warranty Product", warranty_years=0, is_active=True)
        create_product(name="Inactive Warranty Product", warranty_years=5, is_active=False)
        create_product(
            name="Unlinked Warranty Basecoat",
            product_type=ProductType.BASECOAT,
            warranty_years=3,
            is_active=True,
        )
        create_product_basecoat(topcoat=topcoat, basecoat=linked_basecoat)
        self.client.force_authenticate(user=self.cs_user)

        all_response = self.client.get(reverse("product_warranty_option_list"))
        response = self.client.get(
            reverse("product_warranty_option_list"),
            {"product_type": ProductType.BASECOAT, "topcoat_id": topcoat.id},
        )

        self.assertEqual(all_response.status_code, status.HTTP_200_OK)
        self.assertEqual(all_response.data["count"], 3)
        self.assertNotIn("Zero Warranty Product", [item["name"] for item in all_response.data["results"]])
        self.assertNotIn("Inactive Warranty Product", [item["name"] for item in all_response.data["results"]])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], linked_basecoat.id)

    def test_search_by_name(self):
        create_product(name="Dulux Inspire Interior")
        create_product(name="Dulux Weather Shield Max")
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(self.list_url, {"search": "Weather"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Dulux Weather Shield Max")

    def test_cs_agent_can_create_product(self):
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            self.list_url,
            {
                "name": "Dulux New Product",
                "product_type": ProductType.TOPCOAT,
                "warranty_years": 5,
                "features": "Washable finish",
                "coverage_details": "100 sqft per liter",
                "webpage_url": "https://example.com/products/new-product",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Dulux New Product")

    def test_admin_can_create_topcoat(self):
        surface_type = create_surface_type()
        basecoat = create_product(name="Dulux Linked Basecoat", product_type=ProductType.BASECOAT, warranty_years=3)
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            self.list_url,
            {
                "name": "Dulux Admin Topcoat",
                "product_type": ProductType.TOPCOAT,
                "warranty_years": 5,
                "features": "Washable finish",
                "coverage_details": "100 sqft per liter",
                "webpage_url": "https://example.com/products/topcoat",
                "surface_types": [surface_type.id],
                "basecoats": [basecoat.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["product_type"], ProductType.TOPCOAT)
        self.assertEqual(response.data["warranty_years"], 5)
        self.assertEqual(response.data["surface_types"][0]["id"], surface_type.id)
        self.assertEqual(response.data["basecoats"][0]["id"], basecoat.id)

    def test_admin_can_create_basecoat(self):
        surface_type = create_surface_type(name="Brick")
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            self.list_url,
            {
                "name": "Dulux Admin Basecoat",
                "product_type": ProductType.BASECOAT,
                "warranty_years": 3,
                "features": "Base preparation coat",
                "coverage_details": "90 sqft per liter",
                "webpage_url": "https://example.com/products/basecoat",
                "surface_types": [surface_type.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["product_type"], ProductType.BASECOAT)
        self.assertEqual(response.data["warranty_years"], 3)
        self.assertEqual(response.data["surface_types"][0]["id"], surface_type.id)
        self.assertEqual(response.data["basecoats"], [])

    def test_admin_cannot_assign_basecoats_to_non_topcoat_product(self):
        surface_type = create_surface_type(name="Brick")
        basecoat = create_product(name="Linked Basecoat", product_type=ProductType.BASECOAT, warranty_years=3)
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            self.list_url,
            {
                "name": "Invalid Basecoat Product",
                "product_type": ProductType.BASECOAT,
                "warranty_years": 3,
                "features": "Base preparation coat",
                "coverage_details": "90 sqft per liter",
                "webpage_url": "https://example.com/products/basecoat-invalid",
                "surface_types": [surface_type.id],
                "basecoats": [basecoat.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["basecoats"], "Basecoats can only be assigned to TOPCOAT products.")

    def test_admin_cannot_create_product_without_required_fields(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            self.list_url,
            {
                "name": "Invalid Product",
                "product_type": ProductType.BASECOAT,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("warranty_years", response.data)
        self.assertIn("features", response.data)
        self.assertIn("coverage_details", response.data)
        self.assertIn("webpage_url", response.data)

    def test_admin_can_patch_product(self):
        product = create_product(name="Patch Me", warranty_years=5)
        basecoat = create_product(name="Patch Basecoat", product_type=ProductType.BASECOAT, warranty_years=3)
        old_surface_type = create_surface_type(name="Wood")
        new_surface_type = create_surface_type(name="Metal")
        create_product_surface_mapping(product=product, surface_type=old_surface_type)
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.patch(
            reverse("product_detail", kwargs={"pk": product.pk}),
            {"is_active": False, "surface_types": [new_surface_type.id], "basecoats": [basecoat.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_active"])
        self.assertEqual(len(response.data["surface_types"]), 1)
        self.assertEqual(response.data["surface_types"][0]["id"], new_surface_type.id)
        self.assertEqual(len(response.data["basecoats"]), 1)
        self.assertEqual(response.data["basecoats"][0]["id"], basecoat.id)

    def test_cs_agent_can_patch_product(self):
        product = create_product(name="Patch Me Too", warranty_years=5)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("product_detail", kwargs={"pk": product.pk}),
            {"is_active": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_active"])

    def test_can_list_basecoats_for_topcoat(self):
        topcoat = create_product(name="Linked Topcoat", product_type=ProductType.TOPCOAT, warranty_years=5)
        basecoat_one = create_product(name="Basecoat One", product_type=ProductType.BASECOAT, warranty_years=3)
        basecoat_two = create_product(name="Basecoat Two", product_type=ProductType.BASECOAT, warranty_years=3)
        create_product_basecoat(topcoat=topcoat, basecoat=basecoat_one)
        create_product_basecoat(topcoat=topcoat, basecoat=basecoat_two)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(reverse("product_basecoat_list", kwargs={"pk": topcoat.pk}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(
            [item["name"] for item in response.data["results"]],
            ["Basecoat One", "Basecoat Two"],
        )

    def test_basecoat_list_rejects_non_topcoat_product(self):
        basecoat = create_product(name="Standalone Basecoat", product_type=ProductType.BASECOAT, warranty_years=3)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(reverse("product_basecoat_list", kwargs={"pk": basecoat.pk}))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Basecoat list is only available for TOPCOAT products.")

    def test_admin_can_delete_product(self):
        product = create_product(name="Delete Me", warranty_years=5)
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.delete(reverse("product_detail", kwargs={"pk": product.pk}))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_cs_agent_can_delete_product(self):
        product = create_product(name="Delete Me Too", warranty_years=5)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.delete(reverse("product_detail", kwargs={"pk": product.pk}))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_cannot_delete_product_when_it_is_in_use(self):
        from dulux_chatbot.warranty.tests.factories import create_paint_pair, create_registration

        product = create_product(name="Used Product", warranty_years=5)
        registration = create_registration()
        create_paint_pair(registration=registration, topcoat=product)
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.delete(reverse("product_detail", kwargs={"pk": product.pk}))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Product cannot be deleted because it is linked to existing warranty registrations, claims, or product mappings.",
        )

    def test_cs_agent_can_upload_product_image(self):
        product = create_product()
        image = create_image()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            reverse("product_image_list_create", kwargs={"product_pk": product.pk}),
            {"image_id": image.pk},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("image", response.data)

    def test_cs_agent_can_delete_product_image(self):
        product = create_product()
        product_image = attach_product_image(product=product)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.delete(
            reverse("product_image_destroy", kwargs={"product_pk": product.pk, "pk": product_image.pk})
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_cs_agent_can_create_surface_type(self):
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.post(
            reverse("surface_type_list_create"),
            {"name": "Concrete", "environment": "EXTERIOR"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Concrete")

    def test_cs_agent_can_patch_surface_type(self):
        surface_type = create_surface_type()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.patch(
            reverse("surface_type_detail", kwargs={"pk": surface_type.pk}),
            {"name": "Updated Wood"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Updated Wood")

    def test_cs_agent_can_delete_surface_type(self):
        surface_type = create_surface_type()
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.delete(reverse("surface_type_detail", kwargs={"pk": surface_type.pk}))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
