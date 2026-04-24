import type { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig): Promise<void> {
  // Reserved for future teardown hooks.
}

export default globalTeardown;
