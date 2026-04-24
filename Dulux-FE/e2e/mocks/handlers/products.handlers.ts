import type { MockRouteDefinition } from '../routes';

const productsList = {
  count: 3,
  next: null,
  previous: null,
  results: [
    {
      id: 1,
      name: 'Dulux Protect Plus',
      productType: 'TOPCOAT',
      warrantyYears: 10,
      isActive: true,
      surfaceTypes: [],
      linkedBasecoats: [],
    },
    {
      id: 2,
      name: 'Dulux Base Prime',
      productType: 'BASECOAT',
      warrantyYears: 5,
      isActive: true,
      surfaceTypes: [],
      linkedBasecoats: [],
    },
    {
      id: 3,
      name: 'Dulux Exterior Shield',
      productType: 'TOPCOAT',
      warrantyYears: 8,
      isActive: true,
      surfaceTypes: [],
      linkedBasecoats: [{ id: 2, name: 'Dulux Base Prime', warrantyYears: 5 }],
    },
  ],
};

export const productsHandlers: MockRouteDefinition[] = [
  {
    id: 'products-list',
    method: 'GET',
    url: /.*\/api\/v1\/products\/?(?:\?.*)?$/,
    handle: () => ({
      status: 200,
      body: productsList,
    }),
  },
  {
    id: 'surface-types-list',
    method: 'GET',
    url: /.*\/api\/v1\/products\/surface-types\/?(?:\?.*)?$/,
    handle: () => ({
      status: 200,
      body: {
        count: 2,
        next: null,
        previous: null,
        results: [
          { id: 11, name: 'Concrete', environment: 'EXTERIOR', isActive: true },
          { id: 12, name: 'Wood', environment: 'INTERIOR', isActive: true },
        ],
      },
    }),
  },
  {
    id: 'products-warranty-options',
    method: 'GET',
    url: /.*\/api\/v1\/products\/warranty-options\/$/,
    handle: () => ({
      status: 200,
      body: {
        topcoat: [
          { value: '1', label: 'Dulux Protect Plus', warrantyYears: 10 },
          { value: '3', label: 'Dulux Exterior Shield', warrantyYears: 8 },
        ],
        basecoat: [{ value: '2', label: 'Dulux Base Prime', warrantyYears: 5 }],
      },
    }),
  },
];
