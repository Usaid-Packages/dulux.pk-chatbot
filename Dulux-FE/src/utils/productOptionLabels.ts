import type { ManualRegistrationProductOption } from '#/types/manualRegistration';

/**
 * Formats manual-registration product option labels with warranty text when available.
 *
 * @param product - Product option shown in paint selectors.
 * @returns Product label with warranty suffix for zero-or-greater warranty values.
 */
export const getProductOptionLabel = (product: ManualRegistrationProductOption): string => {
  if (typeof product.warrantyYears === 'number' && product.warrantyYears >= 0) {
    return `${product.label} (${product.warrantyYears} year warranty)`;
  }

  return product.label;
};

/**
 * Removes options explicitly marked inactive while preserving historical/fallback options
 * that do not carry an active flag.
 *
 * @param products - Candidate options for product selectors.
 * @returns Options safe to show in linked-basecoat dropdowns.
 */
export const filterActiveProductOptions = (
  products: ManualRegistrationProductOption[]
): ManualRegistrationProductOption[] => {
  return products.filter(product => product.isActive !== false);
};
