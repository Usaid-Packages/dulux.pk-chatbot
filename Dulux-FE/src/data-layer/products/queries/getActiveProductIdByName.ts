/* eslint import/order: off */
import { apiEndpoints } from '#/constants';
import { performRequest } from '#/services';
import type { ProductType } from '#/types/products';

interface ProductLookupResponseItem {
  id?: number;
  name?: string;
}

interface ProductLookupResponse {
  results?: ProductLookupResponseItem[];
}

interface ProductLookupRequestParams {
  search: string;
  productType: ProductType;
  isActive: boolean;
}

export interface GetActiveProductIdByNamePayload {
  name: string;
  productType: ProductType;
}

export const getActiveProductIdByNameRequest = async ({
  name,
  productType,
}: GetActiveProductIdByNamePayload): Promise<number> => {
  const normalizedName = name.trim();
  const params: ProductLookupRequestParams = {
    search: normalizedName,
    productType,
    isActive: true,
  };

  const response = await performRequest<ProductLookupResponse, undefined, ProductLookupRequestParams>({
    method: 'get',
    url: apiEndpoints.products.list,
    params,
  });

  const products = response.results ?? [];
  const exactMatch = products.find(product => product.name?.trim().toLowerCase() === normalizedName.toLowerCase());
  const fallback = products[0];
  const match = exactMatch ?? fallback;

  if (!match?.id) {
    throw new Error(`No active ${productType.toLowerCase()} product found for "${normalizedName}".`);
  }

  return match.id;
};
