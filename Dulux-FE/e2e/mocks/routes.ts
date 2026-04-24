import type { Page, Request, Route } from '@playwright/test';

import { auditLogsHandlers } from './handlers/auditLogs.handlers';
import { authHandlers } from './handlers/auth.handlers';
import { claimsHandlers, resetClaimsMockStore } from './handlers/claims.handlers';
import { complaintsHandlers, resetComplaintsMockStore } from './handlers/complaints.handlers';
import { coreHandlers } from './handlers/core.handlers';
import { dashboardHandlers } from './handlers/dashboard.handlers';
import { importHandlers } from './handlers/import.handlers';
import { productsHandlers } from './handlers/products.handlers';
import { qualityHandlers } from './handlers/quality.handlers';
import { registrationsHandlers } from './handlers/registrations.handlers';

export type RouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface MockRouteResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

interface MockRouteContext {
  request: Request;
  route: Route;
}

export interface MockRouteDefinition {
  id: string;
  method: RouteMethod;
  url: RegExp;
  handle: (context: MockRouteContext) => MockRouteResponse | Promise<MockRouteResponse>;
}

const JSON_CONTENT_TYPE = 'application/json';

const toJsonBody = (body: unknown): string => {
  if (body === undefined) {
    return '';
  }

  return JSON.stringify(body);
};

const installHandler = async (page: Page, definition: MockRouteDefinition): Promise<void> => {
  await page.route(definition.url, async route => {
    const request = route.request();

    if (request.method() !== definition.method) {
      await route.fallback();
      return;
    }

    const result = await definition.handle({ request, route });
    await route.fulfill({
      status: result.status ?? 200,
      body: toJsonBody(result.body),
      headers: {
        'content-type': JSON_CONTENT_TYPE,
        ...result.headers,
      },
    });
  });
};

const installFallback = async (page: Page): Promise<void> => {
  await page.route(/.*\/api\/v1\/.*/, async route => {
    await route.fulfill({
      status: 501,
      body: JSON.stringify({ detail: 'No Playwright mock registered for this endpoint.' }),
      headers: {
        'content-type': JSON_CONTENT_TYPE,
      },
    });
  });
};

export const registerMockApiRoutes = async (page: Page): Promise<void> => {
  resetClaimsMockStore();
  resetComplaintsMockStore();

  const definitions: MockRouteDefinition[] = [
    ...coreHandlers,
    ...auditLogsHandlers,
    ...authHandlers,
    ...dashboardHandlers,
    ...registrationsHandlers,
    ...claimsHandlers,
    ...qualityHandlers,
    ...complaintsHandlers,
    ...productsHandlers,
    ...importHandlers,
  ];

  await installFallback(page);

  for (const definition of definitions) {
    await installHandler(page, definition);
  }
};
