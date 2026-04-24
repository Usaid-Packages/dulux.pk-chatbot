import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type AuthRole = 'admin' | 'cs' | 'quality';
export type E2EMode = 'mocked' | 'live';

interface LoginCredentials {
  email: string;
  password: string;
}

const DEFAULT_MOCKED_CREDENTIALS: Record<AuthRole, LoginCredentials> = {
  admin: { email: 'admin.e2e.mock@dulux.local', password: 'mock-admin-password' },
  cs: { email: 'cs.e2e.mock@dulux.local', password: 'mock-cs-password' },
  quality: { email: 'quality.e2e.mock@dulux.local', password: 'mock-quality-password' },
};

const ROLE_CREDENTIAL_ENV_NAMES: Record<AuthRole, { email: string; password: string }> = {
  admin: { email: 'E2E_ADMIN_EMAIL', password: 'E2E_ADMIN_PASSWORD' },
  cs: { email: 'E2E_CS_EMAIL', password: 'E2E_CS_PASSWORD' },
  quality: { email: 'E2E_QUALITY_EMAIL', password: 'E2E_QUALITY_PASSWORD' },
};

const getNormalizedEnv = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
};

export const getE2EMode = (): E2EMode => (process.env.E2E_MODE === 'live' ? 'live' : 'mocked');

const resolveRoleCredentials = (role: AuthRole): LoginCredentials => {
  const mode = getE2EMode();
  const envNames = ROLE_CREDENTIAL_ENV_NAMES[role];
  const fallback = DEFAULT_MOCKED_CREDENTIALS[role];
  const email = getNormalizedEnv(envNames.email) ?? fallback.email;
  const password = getNormalizedEnv(envNames.password) ?? fallback.password;

  if (mode === 'live') {
    const missingVars: string[] = [];

    if (!getNormalizedEnv(envNames.email)) {
      missingVars.push(envNames.email);
    }

    if (!getNormalizedEnv(envNames.password)) {
      missingVars.push(envNames.password);
    }

    if (missingVars.length > 0) {
      throw new Error(`Missing required E2E live credentials for role "${role}". Set: ${missingVars.join(', ')}`);
    }
  }

  return { email, password };
};

export const roleCredentials: Record<AuthRole, LoginCredentials> = {
  admin: resolveRoleCredentials('admin'),
  cs: resolveRoleCredentials('cs'),
  quality: resolveRoleCredentials('quality'),
};

const currentDir = dirname(fileURLToPath(import.meta.url));
const authDir = resolve(currentDir, '../.auth');

export const authStatePaths = {
  admin: resolve(authDir, 'admin.json'),
  cs: resolve(authDir, 'cs.json'),
  quality: resolve(authDir, 'quality.json'),
  anonymous: resolve(authDir, 'anonymous.json'),
} as const;
