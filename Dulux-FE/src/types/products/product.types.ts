/* eslint import/order: off */
export const productTypes = ['TOPCOAT', 'BASECOAT'] as const;
export const productEnvironments = ['INTERIOR', 'EXTERIOR'] as const;

export type ProductType = (typeof productTypes)[number];
export type ProductEnvironment = (typeof productEnvironments)[number];

export interface ProductImageAsset {
  id: number;
  image: string;
  thumbnail: string;
  url: string;
}

export interface ProductImage {
  id: number;
  image: ProductImageAsset;
  created: string;
}

export interface SurfaceType {
  id: number;
  name: string;
  environment: ProductEnvironment;
  created: string;
  modified: string;
}

export interface Product {
  id: number;
  name: string;
  productType: ProductType;
  warrantyYears: number;
  features: string;
  coverageDetails: string;
  webpageUrl: string;
  isActive: boolean;
  surfaceTypes: SurfaceType[];
  images: ProductImage[];
  created: string;
  modified: string;
}

export interface ProductListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export interface SurfaceTypeListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SurfaceType[];
}

export interface ProductQueryParams extends Record<string, unknown> {
  search?: string;
  product_type?: ProductType;
  is_active?: boolean;
  page?: number;
  ordering?: string;
}

export interface SurfaceTypeQueryParams extends Record<string, unknown> {
  search?: string;
  environment?: ProductEnvironment;
  page?: number;
  ordering?: string;
}

export interface ProductMutationPayload extends Record<string, unknown> {
  name: string;
  product_type: ProductType;
  warranty_years: number;
  features: string;
  coverage_details: string;
  webpage_url: string;
  is_active: boolean;
  surface_types: number[];
}

export interface SurfaceTypeMutationPayload extends Record<string, unknown> {
  name: string;
  environment: ProductEnvironment;
}

export interface ProductFormValues {
  name: string;
  productType: ProductType;
  warrantyYears: number;
  coverageDetails: string;
  webpageUrl: string;
  features: string;
  isActive: boolean;
  surfaceTypeIds: number[];
}

export interface SurfaceTypeFormValues {
  name: string;
  environment: ProductEnvironment;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
}
