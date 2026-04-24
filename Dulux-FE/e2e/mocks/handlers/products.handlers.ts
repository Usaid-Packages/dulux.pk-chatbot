import type { MockRouteDefinition } from '../routes';

interface ProductRecord {
  id: number;
  name: string;
  productType: 'TOPCOAT' | 'BASECOAT';
  warrantyYears: number;
  coverageDetails: string;
  webpageUrl: string;
  features: string;
  isActive: boolean;
  surfaceTypes: Array<{ id: number; name: string; environment: 'INTERIOR' | 'EXTERIOR'; isActive: boolean }>;
  basecoats: Array<{ id: number; name: string; warrantyYears: number }>;
  images: Array<{ id: number; image: { id: number; image: string; url: string } }>;
}

interface SurfaceTypeRecord {
  id: number;
  name: string;
  environment: 'INTERIOR' | 'EXTERIOR';
  isActive: boolean;
}

const surfaceTypeStore: SurfaceTypeRecord[] = [
  { id: 11, name: 'Concrete', environment: 'EXTERIOR', isActive: true },
  { id: 12, name: 'Wood', environment: 'INTERIOR', isActive: true },
  { id: 13, name: 'Gypsum', environment: 'INTERIOR', isActive: true },
];

const productStore: ProductRecord[] = [
  {
    id: 1,
    name: 'Dulux Protect Plus',
    productType: 'TOPCOAT',
    warrantyYears: 10,
    coverageDetails: '100 sq ft/liter',
    webpageUrl: 'https://example.com/protect-plus',
    features: 'Durable, weather resistant',
    isActive: true,
    surfaceTypes: [surfaceTypeStore[0]],
    basecoats: [],
    images: [],
  },
  {
    id: 2,
    name: 'Dulux Base Prime',
    productType: 'BASECOAT',
    warrantyYears: 5,
    coverageDetails: '90 sq ft/liter',
    webpageUrl: 'https://example.com/base-prime',
    features: 'Strong adhesion',
    isActive: true,
    surfaceTypes: [surfaceTypeStore[1]],
    basecoats: [],
    images: [],
  },
  {
    id: 3,
    name: 'Dulux Exterior Shield',
    productType: 'TOPCOAT',
    warrantyYears: 8,
    coverageDetails: '95 sq ft/liter',
    webpageUrl: 'https://example.com/exterior-shield',
    features: 'Fade-resistant finish',
    isActive: true,
    surfaceTypes: [surfaceTypeStore[0], surfaceTypeStore[2]],
    basecoats: [{ id: 2, name: 'Dulux Base Prime', warrantyYears: 5 }],
    images: [],
  },
];

const toProductApi = (product: ProductRecord) => ({
  id: product.id,
  name: product.name,
  product_type: product.productType,
  warranty_years: product.warrantyYears,
  coverage_details: product.coverageDetails,
  webpage_url: product.webpageUrl,
  features: product.features,
  is_active: product.isActive,
  surface_types: product.surfaceTypes.map(item => ({
    id: item.id,
    name: item.name,
    environment: item.environment,
    is_active: item.isActive,
  })),
  linked_basecoats: product.basecoats.map(item => ({
    id: item.id,
    name: item.name,
    warranty_years: item.warrantyYears,
  })),
  images: product.images,
});

const parseProductId = (url: string): number | null => {
  const matched = url.match(/\/api\/v1\/products\/(\d+)\/?(?:\?.*)?$/);
  if (!matched) {
    return null;
  }

  const parsed = Number.parseInt(matched[1] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseSurfaceTypeId = (url: string): number | null => {
  const matched = url.match(/\/api\/v1\/products\/surface-types\/(\d+)\/?(?:\?.*)?$/);
  if (!matched) {
    return null;
  }

  const parsed = Number.parseInt(matched[1] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const productsHandlers: MockRouteDefinition[] = [
  {
    id: 'products-list',
    method: 'GET',
    url: /.*\/api\/v1\/products\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      if (request.url().includes('/surface-types') || request.url().includes('/warranty-options')) {
        return {
          status: 404,
          body: { detail: 'Unsupported route for products-list handler.' },
        };
      }

      const search = new URL(request.url()).searchParams.get('search')?.trim().toLowerCase() ?? '';
      const results = productStore.filter(item => (search ? item.name.toLowerCase().includes(search) : true));

      return {
        status: 200,
        body: {
          count: results.length,
          next: null,
          previous: null,
          results: results.map(toProductApi),
        },
      };
    },
  },
  {
    id: 'product-create',
    method: 'POST',
    url: /.*\/api\/v1\/products\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      if (request.url().includes('/surface-types') || request.url().includes('/warranty-options')) {
        return {
          status: 404,
          body: { detail: 'Unsupported route for product-create handler.' },
        };
      }

      const payload = (request.postDataJSON() as Record<string, unknown> | null) ?? {};
      const nextId = productStore.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
      const mappedSurfaceTypes = (Array.isArray(payload.surface_types) ? payload.surface_types : [])
        .map(value => Number(value))
        .filter(value => Number.isFinite(value))
        .flatMap(value => {
          const matched = surfaceTypeStore.find(item => item.id === value);
          return matched ? [matched] : [];
        });

      const createdProduct: ProductRecord = {
        id: nextId,
        name: typeof payload.name === 'string' ? payload.name : `Product ${nextId}`,
        productType: payload.product_type === 'BASECOAT' ? 'BASECOAT' : 'TOPCOAT',
        warrantyYears: Number(payload.warranty_years ?? 0),
        coverageDetails: typeof payload.coverage_details === 'string' ? payload.coverage_details : '',
        webpageUrl: typeof payload.webpage_url === 'string' ? payload.webpage_url : 'https://example.com',
        features: typeof payload.features === 'string' ? payload.features : '',
        isActive: payload.is_active !== false,
        surfaceTypes: mappedSurfaceTypes,
        basecoats: [],
        images: [],
      };

      productStore.unshift(createdProduct);

      return {
        status: 201,
        body: toProductApi(createdProduct),
      };
    },
  },
  {
    id: 'product-detail-get',
    method: 'GET',
    url: /.*\/api\/v1\/products\/\d+\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const productId = parseProductId(request.url());
      const product = productStore.find(item => item.id === productId);

      if (!product) {
        return {
          status: 404,
          body: { detail: 'Product not found.' },
        };
      }

      return {
        status: 200,
        body: toProductApi(product),
      };
    },
  },
  {
    id: 'product-detail-update',
    method: 'PATCH',
    url: /.*\/api\/v1\/products\/\d+\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const productId = parseProductId(request.url());
      const product = productStore.find(item => item.id === productId);

      if (!product) {
        return {
          status: 404,
          body: { detail: 'Product not found.' },
        };
      }

      const payload = (request.postDataJSON() as Record<string, unknown> | null) ?? {};
      if (typeof payload.name === 'string') {
        product.name = payload.name;
      }
      if (typeof payload.coverage_details === 'string') {
        product.coverageDetails = payload.coverage_details;
      }
      if (typeof payload.features === 'string') {
        product.features = payload.features;
      }

      return {
        status: 200,
        body: toProductApi(product),
      };
    },
  },
  {
    id: 'product-detail-delete',
    method: 'DELETE',
    url: /.*\/api\/v1\/products\/\d+\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const productId = parseProductId(request.url());
      const index = productStore.findIndex(item => item.id === productId);

      if (index >= 0) {
        productStore.splice(index, 1);
      }

      return {
        status: 204,
      };
    },
  },
  {
    id: 'surface-types-list',
    method: 'GET',
    url: /.*\/api\/v1\/products\/surface-types\/?(?:\?.*)?$/,
    handle: () => ({
      status: 200,
      body: {
        count: surfaceTypeStore.length,
        next: null,
        previous: null,
        results: surfaceTypeStore.map(item => ({
          id: item.id,
          name: item.name,
          environment: item.environment,
          is_active: item.isActive,
        })),
      },
    }),
  },
  {
    id: 'surface-types-create',
    method: 'POST',
    url: /.*\/api\/v1\/products\/surface-types\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const payload = (request.postDataJSON() as Record<string, unknown> | null) ?? {};
      const nextId = surfaceTypeStore.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
      const created: SurfaceTypeRecord = {
        id: nextId,
        name: typeof payload.name === 'string' ? payload.name : `Surface ${nextId}`,
        environment: payload.environment === 'EXTERIOR' ? 'EXTERIOR' : 'INTERIOR',
        isActive: payload.is_active !== false,
      };

      surfaceTypeStore.unshift(created);

      return {
        status: 201,
        body: {
          id: created.id,
          name: created.name,
          environment: created.environment,
          is_active: created.isActive,
        },
      };
    },
  },
  {
    id: 'surface-types-update',
    method: 'PATCH',
    url: /.*\/api\/v1\/products\/surface-types\/\d+\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const surfaceTypeId = parseSurfaceTypeId(request.url());
      const surfaceType = surfaceTypeStore.find(item => item.id === surfaceTypeId);

      if (!surfaceType) {
        return {
          status: 404,
          body: { detail: 'Surface type not found.' },
        };
      }

      const payload = (request.postDataJSON() as Record<string, unknown> | null) ?? {};
      if (typeof payload.name === 'string') {
        surfaceType.name = payload.name;
      }
      if (payload.environment === 'INTERIOR' || payload.environment === 'EXTERIOR') {
        surfaceType.environment = payload.environment;
      }

      return {
        status: 200,
        body: {
          id: surfaceType.id,
          name: surfaceType.name,
          environment: surfaceType.environment,
          is_active: surfaceType.isActive,
        },
      };
    },
  },
  {
    id: 'surface-types-delete',
    method: 'DELETE',
    url: /.*\/api\/v1\/products\/surface-types\/\d+\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const surfaceTypeId = parseSurfaceTypeId(request.url());
      const index = surfaceTypeStore.findIndex(item => item.id === surfaceTypeId);

      if (index >= 0) {
        surfaceTypeStore.splice(index, 1);
      }

      return {
        status: 204,
      };
    },
  },
  {
    id: 'products-warranty-options',
    method: 'GET',
    url: /.*\/api\/v1\/products\/warranty-options\/?(?:\?.*)?$/,
    handle: () => ({
      status: 200,
      body: {
        topcoat: productStore
          .filter(item => item.productType === 'TOPCOAT')
          .map(item => ({
            value: String(item.id),
            label: item.name,
            warrantyYears: item.warrantyYears,
          })),
        basecoat: productStore
          .filter(item => item.productType === 'BASECOAT')
          .map(item => ({
            value: String(item.id),
            label: item.name,
            warrantyYears: item.warrantyYears,
          })),
      },
    }),
  },
  {
    id: 'products-basecoats',
    method: 'GET',
    url: /.*\/api\/v1\/products\/\d+\/basecoats\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const productId = parseProductId(request.url().replace('/basecoats', ''));
      const product = productStore.find(item => item.id === productId);

      return {
        status: 200,
        body: {
          count: product?.basecoats.length ?? 0,
          next: null,
          previous: null,
          results: (product?.basecoats ?? []).map(item => ({
            id: item.id,
            name: item.name,
            warranty_years: item.warrantyYears,
            product_type: 'BASECOAT',
            is_active: true,
            surface_types: [],
            linked_basecoats: [],
            images: [],
          })),
        },
      };
    },
  },
];
