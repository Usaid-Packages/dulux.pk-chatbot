from django.db import transaction
from rest_framework import serializers

from dulux_chatbot.audit_logs.services import build_instance_snapshot, log_create, log_delete, log_update
from dulux_chatbot.core.api.v1.serializers import ImageSerializer
from dulux_chatbot.core.models import Image
from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.models import Product, ProductBasecoat, ProductImage, ProductSurfaceMapping, SurfaceType
from dulux_chatbot.products.utils.audit import build_product_snapshot


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
        request = self.context["request"]
        data["url"] = request.build_absolute_uri(image_url) if request is not None else image_url
        return data

    @transaction.atomic
    def create(self, validated_data: dict) -> ProductImage:
        product_image = super().create(validated_data)
        request = self.context["request"]
        log_create(
            actor=request.user,
            instance=product_image,
            request=request,
        )
        return product_image


class SurfaceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurfaceType
        fields = ("id", "name", "environment", "created", "modified")
        read_only_fields = ("id", "created", "modified")

    def create(self, validated_data: dict) -> SurfaceType:
        instance = super().create(validated_data)
        request = self.context["request"]
        log_create(actor=request.user, instance=instance, request=request)
        return instance

    def update(self, instance: SurfaceType, validated_data: dict) -> SurfaceType:
        request = self.context["request"]
        before_data = build_instance_snapshot(instance)
        instance = super().update(instance, validated_data)
        log_update(
            actor=request.user,
            instance=instance,
            request=request,
            before_data=before_data,
        )
        return instance


class ProductBasecoatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ("id", "name", "product_type", "warranty_years", "is_active", "created", "modified")
        read_only_fields = fields


class ProductWarrantyOptionQuerySerializer(serializers.Serializer):
    product_type = serializers.ChoiceField(choices=ProductType.choices, required=False)
    topcoat_id = serializers.IntegerField(min_value=1, required=False)


class ProductWarrantyOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ("id", "name", "product_type", "warranty_years", "is_active")
        read_only_fields = fields


class ProductSerializer(serializers.ModelSerializer):
    """
    Requires `prefetch_related("images__image", "surface_mappings__surface_type", "basecoat_mappings__basecoat")`
    on the product queryset. If those relations are not prefetched before
    serialization, this serializer will trigger N+1 queries.
    """

    images = ProductImageSerializer(many=True, read_only=True)
    surface_types = serializers.PrimaryKeyRelatedField(
        queryset=SurfaceType.objects.all(),
        many=True,
        required=False,
        allow_empty=True,
        allow_null=True,
    )
    basecoats = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(product_type=ProductType.BASECOAT),
        many=True,
        required=False,
        allow_empty=True,
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
            "basecoats",
            "images",
            "created",
            "modified",
        )
        read_only_fields = ("id", "created", "modified")

    @transaction.atomic
    def create(self, validated_data: dict) -> Product:
        surface_types = validated_data.pop("surface_types", [])
        basecoats = validated_data.pop("basecoats", [])
        self._validate_basecoats(product_type=validated_data.get("product_type"), basecoats=basecoats)
        product = super().create(validated_data)
        self._sync_surface_types(product=product, surface_types=surface_types)
        self._sync_basecoats(product=product, basecoats=basecoats)
        request = self.context["request"]
        log_create(
            actor=request.user,
            instance=product,
            request=request,
            after_data=build_product_snapshot(product),
        )
        return product

    @transaction.atomic
    def update(self, instance: Product, validated_data: dict) -> Product:
        request = self.context["request"]
        before_data = build_product_snapshot(instance)
        surface_types = validated_data.pop("surface_types", None)
        basecoats = validated_data.pop("basecoats", None)
        product_type = validated_data.get("product_type", instance.product_type)
        if basecoats is not None:
            self._validate_basecoats(product_type=product_type, basecoats=basecoats)
        product = super().update(instance, validated_data)
        if surface_types is not None:
            self._sync_surface_types(product=product, surface_types=surface_types)
        if basecoats is not None:
            self._sync_basecoats(product=product, basecoats=basecoats)
        elif product.product_type != ProductType.TOPCOAT:
            self._sync_basecoats(product=product, basecoats=[])
        log_update(
            actor=request.user,
            instance=product,
            request=request,
            before_data=before_data,
            after_data=build_product_snapshot(product),
        )
        return product

    def to_representation(self, instance: Product) -> dict:
        data = super().to_representation(instance)
        mappings = instance.surface_mappings.all()
        surface_types = [mapping.surface_type for mapping in mappings]
        basecoat_mappings = instance.basecoat_mappings.all()
        basecoats = [mapping.basecoat for mapping in basecoat_mappings]
        data["surface_types"] = SurfaceTypeSerializer(
            surface_types,
            many=True,
            context=self.context,
        ).data
        data["basecoats"] = ProductBasecoatSerializer(
            basecoats,
            many=True,
            context=self.context,
        ).data
        return data

    def _validate_basecoats(self, *, product_type: str | None, basecoats: list[Product]) -> None:
        if not basecoats:
            return
        if product_type != ProductType.TOPCOAT:
            raise serializers.ValidationError({"basecoats": "Basecoats can only be assigned to TOPCOAT products."})
        invalid_basecoats = [basecoat.id for basecoat in basecoats if basecoat.product_type != ProductType.BASECOAT]
        if invalid_basecoats:
            raise serializers.ValidationError({"basecoats": "All selected basecoats must be BASECOAT products."})

    def _sync_surface_types(self, *, product: Product, surface_types: list[SurfaceType]) -> None:
        request = self.context["request"]
        actor = request.user
        surface_type_ids = {surface_type.id for surface_type in surface_types}
        deleted_mappings = list(
            ProductSurfaceMapping.objects.filter(product=product).exclude(surface_type_id__in=surface_type_ids)
        )
        for mapping in deleted_mappings:
            log_delete(actor=actor, instance=mapping, request=request)
        ProductSurfaceMapping.objects.filter(pk__in=[mapping.pk for mapping in deleted_mappings]).delete()

        existing_ids = set(
            ProductSurfaceMapping.objects.filter(product=product, surface_type_id__in=surface_type_ids).values_list(
                "surface_type_id",
                flat=True,
            )
        )

        new_mappings = [
            ProductSurfaceMapping(product=product, surface_type=surface_type)
            for surface_type in surface_types
            if surface_type.id not in existing_ids
        ]
        created_mappings = ProductSurfaceMapping.objects.bulk_create(new_mappings)
        for mapping in created_mappings:
            log_create(actor=actor, instance=mapping, request=request)

    def _sync_basecoats(self, *, product: Product, basecoats: list[Product]) -> None:
        request = self.context["request"]
        actor = request.user
        basecoat_ids = {basecoat.id for basecoat in basecoats}
        deleted_mappings = list(ProductBasecoat.objects.filter(topcoat=product).exclude(basecoat_id__in=basecoat_ids))
        for mapping in deleted_mappings:
            log_delete(actor=actor, instance=mapping, request=request)
        ProductBasecoat.objects.filter(pk__in=[mapping.pk for mapping in deleted_mappings]).delete()

        existing_ids = set(
            ProductBasecoat.objects.filter(topcoat=product, basecoat_id__in=basecoat_ids).values_list(
                "basecoat_id",
                flat=True,
            )
        )

        new_mappings = [
            ProductBasecoat(topcoat=product, basecoat=basecoat)
            for basecoat in basecoats
            if basecoat.id not in existing_ids
        ]
        created_mappings = ProductBasecoat.objects.bulk_create(new_mappings)
        for mapping in created_mappings:
            log_create(actor=actor, instance=mapping, request=request)
