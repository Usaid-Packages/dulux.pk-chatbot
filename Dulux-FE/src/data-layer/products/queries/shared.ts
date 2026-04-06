import type {
  Product,
  ProductImage,
  ProductListResponse,
  ProductQueryParams,
  ProductType,
  SurfaceType,
  SurfaceTypeListResponse,
  SurfaceTypeQueryParams,
} from '#/types/products';

interface ProductImageAssetApiResponse {
  id?: number;
  image?: string;
  thumbnail?: string;
  url?: string;
}

interface ProductImageApiResponse {
  id?: number;
  image?: ProductImageAssetApiResponse;
  created?: string;
}

interface SurfaceTypeApiResponse {
  id?: number;
  name?: string;
  environment?: string;
  created?: string;
  modified?: string;
}

interface ProductApiResponse {
  id?: number;
  name?: string;
  product_type?: string;
  warranty_years?: number;
  features?: string;
  coverage_details?: string;
  webpage_url?: string;
  is_active?: boolean;
  surface_types?: SurfaceTypeApiResponse[];
  images?: ProductImageApiResponse[];
  created?: string;
  modified?: string;
}

interface PaginatedApiResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
}

const isProductType = (value: string): value is ProductType => value === 'TOPCOAT' || value === 'BASECOAT';

const normalizeProductImage = (response: ProductImageApiResponse): ProductImage => ({
  id: response.id ?? 0,
  image: {
    id: response.image?.id ?? 0,
    image: response.image?.image ?? '',
    thumbnail: response.image?.thumbnail ?? '',
    url: response.image?.url ?? response.image?.image ?? '',
  },
  created: response.created ?? '',
});

export const normalizeSurfaceType = (response: SurfaceTypeApiResponse): SurfaceType => ({
  id: response.id ?? 0,
  name: response.name ?? '',
  environment: response.environment === 'INTERIOR' ? 'INTERIOR' : 'EXTERIOR',
  created: response.created ?? '',
  modified: response.modified ?? '',
});

export const normalizeProduct = (response: ProductApiResponse): Product => ({
  id: response.id ?? 0,
  name: response.name ?? '',
  productType: isProductType(response.product_type ?? '') ? response.product_type : 'TOPCOAT',
  warrantyYears: response.warranty_years ?? 0,
  features: response.features ?? '',
  coverageDetails: response.coverage_details ?? '',
  webpageUrl: response.webpage_url ?? '',
  isActive: response.is_active ?? false,
  surfaceTypes: (response.surface_types ?? []).map(normalizeSurfaceType),
  images: (response.images ?? []).map(normalizeProductImage),
  created: response.created ?? '',
  modified: response.modified ?? '',
});

export const normalizeProductsResponse = (response: PaginatedApiResponse<ProductApiResponse>): ProductListResponse => ({
  count: response.count ?? response.results?.length ?? 0,
  next: response.next ?? null,
  previous: response.previous ?? null,
  results: (response.results ?? []).map(normalizeProduct),
});

export const normalizeSurfaceTypesResponse = (
  response: PaginatedApiResponse<SurfaceTypeApiResponse>
): SurfaceTypeListResponse => ({
  count: response.count ?? response.results?.length ?? 0,
  next: response.next ?? null,
  previous: response.previous ?? null,
  results: (response.results ?? []).map(normalizeSurfaceType),
});

const toSortedEntries = (params: Record<string, unknown>): [string, unknown][] => {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey));
};

export const serializeProductParams = (params?: ProductQueryParams): string => {
  if (!params) {
    return '{}';
  }

  return JSON.stringify(Object.fromEntries(toSortedEntries(params)));
};

export const serializeSurfaceTypeParams = (params?: SurfaceTypeQueryParams): string => {
  if (!params) {
    return '{}';
  }

  return JSON.stringify(Object.fromEntries(toSortedEntries(params)));
};

export type { PaginatedApiResponse, ProductApiResponse, SurfaceTypeApiResponse };
