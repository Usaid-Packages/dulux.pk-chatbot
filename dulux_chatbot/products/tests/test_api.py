from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.tests.factories import (
    attach_product_image,
    create_admin_user,
    create_cs_user,
    create_product,
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
        surface_type = create_surface_type()
        create_product_surface_mapping(product=product, surface_type=surface_type)
        attach_product_image(product=product)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 1)
        result = response.data["results"][0]
        self.assertEqual(result["name"], "Dulux Velvet Touch")
        self.assertEqual(len(result["images"]), 1)
        self.assertIn("image", result["images"][0])
        self.assertIn("url", result["images"][0]["image"])
        self.assertEqual(len(result["surface_types"]), 1)
        self.assertEqual(result["surface_types"][0]["id"], surface_type.id)

    def test_filter_by_product_type_and_active_state(self):
        create_product(name="Active Topcoat", product_type=ProductType.TOPCOAT, warranty_years=6, is_active=True)
        create_product(name="Inactive Basecoat", product_type=ProductType.BASECOAT, warranty_years=3, is_active=False)
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(self.list_url, {"product_type": ProductType.BASECOAT, "is_active": False})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Inactive Basecoat")

    def test_search_by_name(self):
        create_product(name="Dulux Inspire Interior")
        create_product(name="Dulux Weather Shield Max")
        self.client.force_authenticate(user=self.cs_user)

        response = self.client.get(self.list_url, {"search": "Weather"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Dulux Weather Shield Max")

    def test_non_admin_post_returns_403(self):
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

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_topcoat(self):
        surface_type = create_surface_type()
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
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["product_type"], ProductType.TOPCOAT)
        self.assertEqual(response.data["warranty_years"], 5)
        self.assertEqual(response.data["surface_types"][0]["id"], surface_type.id)

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
        old_surface_type = create_surface_type(name="Wood")
        new_surface_type = create_surface_type(name="Metal")
        create_product_surface_mapping(product=product, surface_type=old_surface_type)
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.patch(
            reverse("product_detail", kwargs={"pk": product.pk}),
            {"is_active": False, "surface_types": [new_surface_type.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_active"])
        self.assertEqual(len(response.data["surface_types"]), 1)
        self.assertEqual(response.data["surface_types"][0]["id"], new_surface_type.id)

    def test_admin_can_delete_product(self):
        product = create_product(name="Delete Me", warranty_years=5)
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.delete(reverse("product_detail", kwargs={"pk": product.pk}))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
