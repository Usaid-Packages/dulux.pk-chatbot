export const PRODUCT_FORM_MAX_LENGTHS = {
  coverageDetails: 500,
  features: 500,
} as const;

export const PRODUCT_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
] as const;

export const PRODUCT_IMAGE_ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
