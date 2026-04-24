import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import CryptoJS from 'crypto-js';
import { expect, test as setup } from '@playwright/test';
import type { Page } from '@playwright/test';

import { authStatePaths, getE2EMode, roleCredentials } from './auth.fixture';
import type { AuthRole } from './auth.fixture';
import { LoginPage } from '../pages/LoginPage';

const ensureAuthStatePath = (path: string): void => {
  mkdirSync(dirname(path), { recursive: true });
};

const saveAnonymousState = async (): Promise<void> => {
  ensureAuthStatePath(authStatePaths.anonymous);
  writeFileSync(authStatePaths.anonymous, JSON.stringify({ cookies: [], origins: [] }, null, 2), 'utf-8');
};

const ENCRYPTION_KEY = process.env.VITE_ENCRYPTED_KEY ?? 'qqqq';

const toEncryptedStorageValue = (value: unknown): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(value), ENCRYPTION_KEY).toString();
};

const roleToUserId = (role: AuthRole): number => {
  if (role === 'admin') {
    return 1;
  }

  if (role === 'quality') {
    return 3;
  }

  return 2;
};

const roleToRouteRegex = (role: AuthRole): RegExp => {
  if (role === 'quality') {
    return /\/quality(?:\?.*)?$/;
  }

  return /\/dashboard(?:\?.*)?$/;
};

const seedMockedRoleStorageState = async ({
  page,
  role,
  path,
}: {
  page: Page;
  role: AuthRole;
  path: string;
}): Promise<void> => {
  ensureAuthStatePath(path);

  const credentials = roleCredentials[role];
  const encryptedAccessToken = toEncryptedStorageValue(`${role}-access-token`);
  const encryptedRefreshToken = toEncryptedStorageValue(`${role}-refresh-token`);
  const encryptedUser = toEncryptedStorageValue({
    id: roleToUserId(role),
    email: credentials.email,
    role,
  });

  await page.goto('login');
  await page.evaluate(
    ({ encryptedAccessToken, encryptedRefreshToken, encryptedUser }) => {
      localStorage.setItem('access_token', encryptedAccessToken);
      localStorage.setItem('refresh_token', encryptedRefreshToken);
      localStorage.setItem('auth_user', encryptedUser);
    },
    { encryptedAccessToken, encryptedRefreshToken, encryptedUser }
  );

  await page.goto('');
  await expect(page).toHaveURL(roleToRouteRegex(role));
  await page.context().storageState({ path });
};

const seedLiveRoleStorageState = async ({
  page,
  role,
  path,
}: {
  page: Page;
  role: AuthRole;
  path: string;
}): Promise<void> => {
  ensureAuthStatePath(path);

  const loginPage = new LoginPage(page);
  const credentials = roleCredentials[role];

  await loginPage.goto();
  await loginPage.login({
    email: credentials.email,
    password: credentials.password,
  });
  await expect(page).toHaveURL(roleToRouteRegex(role));
  await page.context().storageState({ path });
};

const seedRoleStorageState = async ({
  page,
  role,
  path,
}: {
  page: Page;
  role: AuthRole;
  path: string;
}): Promise<void> => {
  const mode = getE2EMode();
  if (mode === 'live') {
    await seedLiveRoleStorageState({ page, role, path });
    return;
  }

  await seedMockedRoleStorageState({ page, role, path });
};

setup('persist anonymous storage state', async (): Promise<void> => {
  await saveAnonymousState();
});

setup('persist admin storage state', async ({ page }): Promise<void> => {
  await seedRoleStorageState({ page, role: 'admin', path: authStatePaths.admin });
});

setup('persist cs storage state', async ({ page }): Promise<void> => {
  await seedRoleStorageState({ page, role: 'cs', path: authStatePaths.cs });
});

setup('persist quality storage state', async ({ page }): Promise<void> => {
  await seedRoleStorageState({ page, role: 'quality', path: authStatePaths.quality });
});
