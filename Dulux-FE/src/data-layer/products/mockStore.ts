/* eslint import/order: off */
import type {
  Product,
  ProductListResponse,
  ProductMutationPayload,
  ProductQueryParams,
  SurfaceType,
  SurfaceTypeListResponse,
  SurfaceTypeMutationPayload,
  SurfaceTypeQueryParams,
} from '#/types/products';

const PAGE_SIZE = 10;
const MOCK_DELAY_MS = 140;

const now = new Date().toISOString();

const surfaceTypesMap = new Map<number, SurfaceType>([
  [1, { id: 1, name: 'Wood', environment: 'INTERIOR', created: now, modified: now }],
  [2, { id: 2, name: 'Brick', environment: 'EXTERIOR', created: now, modified: now }],
  [3, { id: 3, name: 'Concrete', environment: 'EXTERIOR', created: now, modified: now }],
  [4, { id: 4, name: 'Plaster', environment: 'INTERIOR', created: now, modified: now }],
  [5, { id: 5, name: 'Metal', environment: 'EXTERIOR', created: now, modified: now }],
]);

const productsMap = new Map<number, Product>([
  [
    101,
    {
      id: 101,
      name: 'Dulux WeatherShield Max',
      productType: 'TOPCOAT',
      warrantyYears: 10,
      features: 'High weather resistance with anti-fungal protection.',
      coverageDetails: '120-140 sq ft per liter on smooth plaster.',
      webpageUrl: 'https://example.com/products/dulux-weathershield-max',
      isActive: true,
      surfaceTypes: [surfaceTypesMap.get(2), surfaceTypesMap.get(3), surfaceTypesMap.get(5)].filter(
        (surface): surface is SurfaceType => Boolean(surface)
      ),
      images: [],
      created: now,
      modified: now,
    },
  ],
  [
    102,
    {
      id: 102,
      name: 'Dulux Velvet Touch',
      productType: 'TOPCOAT',
      warrantyYears: 7,
      features: 'Smooth finish with high washability for interior spaces.',
      coverageDetails: '110-130 sq ft per liter on prepared interior walls.',
      webpageUrl: 'https://example.com/products/dulux-velvet-touch',
      isActive: true,
      surfaceTypes: [surfaceTypesMap.get(1), surfaceTypesMap.get(4)].filter((surface): surface is SurfaceType =>
        Boolean(surface)
      ),
      images: [],
      created: now,
      modified: now,
    },
  ],
  [
    103,
    {
      id: 103,
      name: 'Dulux PrimeGuard Base',
      productType: 'BASECOAT',
      warrantyYears: 5,
      features: 'Strong bonding basecoat to improve topcoat durability.',
      coverageDetails: '100-120 sq ft per liter depending on substrate porosity.',
      webpageUrl: 'https://example.com/products/dulux-primeguard-base',
      isActive: false,
      surfaceTypes: [surfaceTypesMap.get(2), surfaceTypesMap.get(3), surfaceTypesMap.get(4)].filter(
        (surface): surface is SurfaceType => Boolean(surface)
      ),
      images: [],
      created: now,
      modified: now,
    },
  ],
]);

let nextProductId = 104;
let nextSurfaceTypeId = 6;

const wait = async (): Promise<void> =>
  new Promise(resolve => {
    window.setTimeout(resolve, MOCK_DELAY_MS);
  });

const cloneProduct = (product: Product): Product => structuredClone(product);

const cloneSurfaceType = (surfaceType: SurfaceType): SurfaceType => structuredClone(surfaceType);

const toSafeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toSafePage = (value: unknown): number => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1;
};

const toSafeBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return undefined;
};

const paginate = <T>(
  items: T[],
  page: number
): { count: number; next: string | null; previous: string | null; results: T[] } => {
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  return {
    count: items.length,
    next: end < items.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: items.slice(start, end),
  };
};

const resolveSurfaceTypesByIds = (ids: number[]): SurfaceType[] => {
  return ids
    .map(id => surfaceTypesMap.get(id))
    .filter((surfaceType): surfaceType is SurfaceType => Boolean(surfaceType))
    .map(cloneSurfaceType);
};

const fetchProducts = (params?: ProductQueryParams): ProductListResponse => {
  const searchTerm = toSafeString(params?.search).toLowerCase();
  const productTypeFilter = toSafeString(params?.product_type).toUpperCase();
  const activeFilter = toSafeBoolean(params?.is_active);
  const page = toSafePage(params?.page);

  const filtered = Array.from(productsMap.values())
    .filter(product => {
      if (!searchTerm) {
        return true;
      }

      return product.name.toLowerCase().includes(searchTerm);
    })
    .filter(product => (productTypeFilter ? product.productType === productTypeFilter : true))
    .filter(product => (activeFilter === undefined ? true : product.isActive === activeFilter))
    .sort((firstItem, secondItem) => firstItem.name.localeCompare(secondItem.name))
    .map(cloneProduct);

  return paginate(filtered, page);
};

const fetchProductById = (id: string): Product => {
  const parsedId = Number.parseInt(id, 10);
  const product = productsMap.get(parsedId);

  if (!product) {
    throw new Error('Product not found.');
  }

  return cloneProduct(product);
};

const fetchSurfaceTypes = (params?: SurfaceTypeQueryParams): SurfaceTypeListResponse => {
  const searchTerm = toSafeString(params?.search).toLowerCase();
  const environmentFilter = toSafeString(params?.environment).toUpperCase();
  const page = toSafePage(params?.page);

  const filtered = Array.from(surfaceTypesMap.values())
    .filter(surfaceType => {
      if (!searchTerm) {
        return true;
      }

      return surfaceType.name.toLowerCase().includes(searchTerm);
    })
    .filter(surfaceType => (environmentFilter ? surfaceType.environment === environmentFilter : true))
    .sort((firstItem, secondItem) => firstItem.name.localeCompare(secondItem.name))
    .map(cloneSurfaceType);

  return paginate(filtered, page);
};

const createProduct = (payload: ProductMutationPayload): Product => {
  const nowIsoString = new Date().toISOString();
  const nextProduct: Product = {
    id: nextProductId,
    name: payload.name,
    productType: payload.product_type,
    warrantyYears: payload.warranty_years,
    features: payload.features,
    coverageDetails: payload.coverage_details,
    webpageUrl: payload.webpage_url,
    isActive: payload.is_active,
    surfaceTypes: resolveSurfaceTypesByIds(payload.surface_types),
    images: [],
    created: nowIsoString,
    modified: nowIsoString,
  };

  productsMap.set(nextProductId, nextProduct);
  nextProductId += 1;

  return cloneProduct(nextProduct);
};

const updateProduct = (id: string, payload: ProductMutationPayload): Product => {
  const parsedId = Number.parseInt(id, 10);
  const currentProduct = productsMap.get(parsedId);

  if (!currentProduct) {
    throw new Error('Product not found.');
  }

  const nextProduct: Product = {
    ...currentProduct,
    name: payload.name,
    productType: payload.product_type,
    warrantyYears: payload.warranty_years,
    features: payload.features,
    coverageDetails: payload.coverage_details,
    webpageUrl: payload.webpage_url,
    isActive: payload.is_active,
    surfaceTypes: resolveSurfaceTypesByIds(payload.surface_types),
    modified: new Date().toISOString(),
  };

  productsMap.set(parsedId, nextProduct);

  return cloneProduct(nextProduct);
};

const deleteProduct = (id: string): void => {
  const parsedId = Number.parseInt(id, 10);
  productsMap.delete(parsedId);
};

const createSurfaceType = (payload: SurfaceTypeMutationPayload): SurfaceType => {
  const nowIsoString = new Date().toISOString();
  const surfaceType: SurfaceType = {
    id: nextSurfaceTypeId,
    name: payload.name,
    environment: payload.environment,
    created: nowIsoString,
    modified: nowIsoString,
  };

  surfaceTypesMap.set(nextSurfaceTypeId, surfaceType);
  nextSurfaceTypeId += 1;

  return cloneSurfaceType(surfaceType);
};

const updateSurfaceType = (id: string, payload: SurfaceTypeMutationPayload): SurfaceType => {
  const parsedId = Number.parseInt(id, 10);
  const currentSurfaceType = surfaceTypesMap.get(parsedId);

  if (!currentSurfaceType) {
    throw new Error('Surface type not found.');
  }

  const nextSurfaceType: SurfaceType = {
    ...currentSurfaceType,
    name: payload.name,
    environment: payload.environment,
    modified: new Date().toISOString(),
  };

  surfaceTypesMap.set(parsedId, nextSurfaceType);

  productsMap.forEach((product, productId) => {
    const nextSurfaceTypes = product.surfaceTypes.map(surfaceType =>
      surfaceType.id === parsedId ? cloneSurfaceType(nextSurfaceType) : surfaceType
    );

    productsMap.set(productId, {
      ...product,
      surfaceTypes: nextSurfaceTypes,
      modified: new Date().toISOString(),
    });
  });

  return cloneSurfaceType(nextSurfaceType);
};

const deleteSurfaceType = (id: string): void => {
  const parsedId = Number.parseInt(id, 10);
  surfaceTypesMap.delete(parsedId);

  productsMap.forEach((product, productId) => {
    const nextSurfaceTypes = product.surfaceTypes.filter(surfaceType => surfaceType.id !== parsedId);

    productsMap.set(productId, {
      ...product,
      surfaceTypes: nextSurfaceTypes,
      modified: new Date().toISOString(),
    });
  });
};

export const productMockStore = {
  fetchProducts: async (params?: ProductQueryParams): Promise<ProductListResponse> => {
    await wait();
    return fetchProducts(params);
  },
  fetchProductById: async (id: string): Promise<Product> => {
    await wait();
    return fetchProductById(id);
  },
  fetchSurfaceTypes: async (params?: SurfaceTypeQueryParams): Promise<SurfaceTypeListResponse> => {
    await wait();
    return fetchSurfaceTypes(params);
  },
  createProduct: async (payload: ProductMutationPayload): Promise<Product> => {
    await wait();
    return createProduct(payload);
  },
  updateProduct: async (id: string, payload: ProductMutationPayload): Promise<Product> => {
    await wait();
    return updateProduct(id, payload);
  },
  deleteProduct: async (id: string): Promise<void> => {
    await wait();
    deleteProduct(id);
  },
  createSurfaceType: async (payload: SurfaceTypeMutationPayload): Promise<SurfaceType> => {
    await wait();
    return createSurfaceType(payload);
  },
  updateSurfaceType: async (id: string, payload: SurfaceTypeMutationPayload): Promise<SurfaceType> => {
    await wait();
    return updateSurfaceType(id, payload);
  },
  deleteSurfaceType: async (id: string): Promise<void> => {
    await wait();
    deleteSurfaceType(id);
  },
};
