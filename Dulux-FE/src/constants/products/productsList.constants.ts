export const FIRST_PAGE = 1;
export const PRODUCT_PAGE_SIZE = 10;
export const SURFACE_TYPE_PAGE_SIZE = 10;
export const INVALID_PAGE_ERROR_MESSAGE = 'Invalid page.';

export const PRODUCTS_LIST_FILTER_ALL = 'ALL';

export const PRODUCTS_LIST_TABS = {
  PRODUCTS: 'products',
  SURFACE_TYPES: 'surface-types',
} as const;

export const PRODUCT_STATUS_FILTER_VALUES = {
  ALL: PRODUCTS_LIST_FILTER_ALL,
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const PRODUCT_ORDERING_VALUES = {
  NAME_ASC: 'name',
  NAME_DESC: '-name',
  CREATED_ASC: 'created',
  CREATED_DESC: '-created',
} as const;

export const SURFACE_ENVIRONMENT_FILTER_VALUES = {
  ALL: PRODUCTS_LIST_FILTER_ALL,
  INTERIOR: 'INTERIOR',
  EXTERIOR: 'EXTERIOR',
} as const;
