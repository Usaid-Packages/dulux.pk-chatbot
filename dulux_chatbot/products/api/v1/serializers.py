from rest_framework import serializers

from dulux_chatbot.core.api.v1.serializers import ImageSerializer
from dulux_chatbot.core.models import Image
from dulux_chatbot.products.models import Product, ProductImage, ProductSurfaceMapping, SurfaceType


class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    image_id = serializers.PrimaryKeyRelatedField(
        queryset=Image.objects.all(),
        source="image",
        write_only=True,
        required=False,
    )

    class Meta:
        model = ProductImage
        fields = ("id", "image", "image_id", "created")
        read_only_fields = ("id", "image", "created")

    def get_image(self, obj: ProductImage) -> dict:
        data = ImageSerializer(obj.image, context=self.context).data
        image_url = obj.image.image.url
        request = self.context.get("request")
        data["url"] = request.build_absolute_uri(image_url) if request is not None else image_url
        return data


class SurfaceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurfaceType
        fields = ("id", "name", "environment", "created", "modified")
        read_only_fields = ("id", "created", "modified")


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    surface_types = serializers.PrimaryKeyRelatedField(
        queryset=SurfaceType.objects.all(),
        many=True,
        required=False,
        allow_empty=True,
        allow_null=True,
    )

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "product_type",
            "warranty_years",
            "features",
            "coverage_details",
            "webpage_url",
            "is_active",
            "surface_types",
            "images",
            "created",
            "modified",
        )
        read_only_fields = ("id", "created", "modified")

    def create(self, validated_data: dict) -> Product:
        surface_types = validated_data.pop("surface_types", [])
        product = super().create(validated_data)
        self._sync_surface_types(product=product, surface_types=surface_types)
        return product

    def update(self, instance: Product, validated_data: dict) -> Product:
        surface_types = validated_data.pop("surface_types", None)
        product = super().update(instance, validated_data)
        if surface_types is not None:
            self._sync_surface_types(product=product, surface_types=surface_types)
        return product

    def to_representation(self, instance: Product) -> dict:
        data = super().to_representation(instance)
        mappings = instance.surface_mappings.all()
        surface_types = [mapping.surface_type for mapping in mappings]
        data["surface_types"] = SurfaceTypeSerializer(
            surface_types,
            many=True,
            context=self.context,
        ).data
        return data

    def _sync_surface_types(self, *, product: Product, surface_types: list[SurfaceType]) -> None:
        surface_type_ids = {surface_type.id for surface_type in surface_types}

        ProductSurfaceMapping.objects.filter(product=product).exclude(surface_type_id__in=surface_type_ids).delete()

        existing_ids = set(
            ProductSurfaceMapping.objects.filter(product=product, surface_type_id__in=surface_type_ids).values_list(
                "surface_type_id",
                flat=True,
            )
        )

        ProductSurfaceMapping.objects.bulk_create(
            [
                ProductSurfaceMapping(product=product, surface_type=surface_type)
                for surface_type in surface_types
                if surface_type.id not in existing_ids
            ]
        )
