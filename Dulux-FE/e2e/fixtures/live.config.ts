const DEFAULT_LOCAL_PORT = 4173;
const DEFAULT_LOCAL_BASE_URL = `http://127.0.0.1:${DEFAULT_LOCAL_PORT}/app/`;

export const LIVE_MODE = 'live' as const;

export const LIVE_PHASE4_DATA_ENV_VARS = [
  'E2E_LIVE_REG_APPROVE_ID',
  'E2E_LIVE_REG_RESUBMIT_ID',
  'E2E_LIVE_REG_REJECT_ID',
  'E2E_LIVE_CLAIM_FORWARD_ID',
  'E2E_LIVE_CLAIM_CSR_RESUBMIT_ID',
  'E2E_LIVE_QUALITY_APPROVE_ID',
  'E2E_LIVE_QUALITY_REQUEST_INFO_ID',
  'E2E_LIVE_QUALITY_REJECT_ID',
  'E2E_LIVE_COMPLAINT_THREAD_ID',
] as const;

export type LivePhase4DataEnvVar = (typeof LIVE_PHASE4_DATA_ENV_VARS)[number];

const normalizeEnvValue = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

export const isLiveMode = (): boolean => process.env.E2E_MODE === LIVE_MODE;

const withTrailingSlash = (url: string): string => (url.endsWith('/') ? url : `${url}/`);

export const getRequiredEnv = (name: string): string => {
  const value = normalizeEnvValue(process.env[name]);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const getPlaywrightBaseUrl = (): string => {
  if (!isLiveMode()) {
    return DEFAULT_LOCAL_BASE_URL;
  }

  return withTrailingSlash(getRequiredEnv('E2E_BASE_URL'));
};

export const getLiveApiBaseUrl = (): string => {
  const apiBaseUrl = getRequiredEnv('E2E_API_BASE_URL');
  return apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
};

export const getRequiredLiveDataId = (name: LivePhase4DataEnvVar): string => getRequiredEnv(name);
