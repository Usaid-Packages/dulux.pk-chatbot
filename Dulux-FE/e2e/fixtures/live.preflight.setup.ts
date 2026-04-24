import { expect, test as setup } from '@playwright/test';

import {
  getLiveApiBaseUrl,
  getRequiredLiveDataId,
  isLiveMode,
  LIVE_PHASE4_DATA_ENV_VARS,
} from './live.config';

const AUTH_LOGIN_ENDPOINT = '/api/v1/users/login/';
const DASHBOARD_CARDS_ENDPOINT = '/api/v1/users/cards/';
const CLAIMS_LIST_ENDPOINT = '/api/v1/warranty/claims/';

const expectReachableApiResponse = (status: number, endpointLabel: string): void => {
  expect(
    status !== 404 && status < 500,
    `Expected ${endpointLabel} to be reachable in live mode (status was ${status}).`
  ).toBeTruthy();
};

setup('live preflight validates required phase4 data env vars', async (): Promise<void> => {
  if (!isLiveMode()) {
    return;
  }

  for (const envVarName of LIVE_PHASE4_DATA_ENV_VARS) {
    getRequiredLiveDataId(envVarName);
  }
});

setup('live preflight validates API reachability and contract shape', async ({ request }): Promise<void> => {
  if (!isLiveMode()) {
    return;
  }

  const apiBaseUrl = getLiveApiBaseUrl();

  const loginResponse = await request.post(`${apiBaseUrl}${AUTH_LOGIN_ENDPOINT}`, {
    data: {
      email: 'e2e-preflight-invalid-user@dulux.local',
      password: 'e2e-invalid-password',
    },
  });

  expectReachableApiResponse(loginResponse.status(), AUTH_LOGIN_ENDPOINT);
  expect(loginResponse.headers()['content-type']?.includes('application/json')).toBeTruthy();

  const dashboardCardsResponse = await request.get(`${apiBaseUrl}${DASHBOARD_CARDS_ENDPOINT}`);
  expectReachableApiResponse(dashboardCardsResponse.status(), DASHBOARD_CARDS_ENDPOINT);

  const claimsListResponse = await request.get(`${apiBaseUrl}${CLAIMS_LIST_ENDPOINT}`);
  expectReachableApiResponse(claimsListResponse.status(), CLAIMS_LIST_ENDPOINT);
});
