import { expect, test as base } from '@playwright/test';

import { registerMockApiRoutes } from '../mocks/routes';

interface MockedDataFixtures {
  mockedDataEnabled: boolean;
}

const isLiveMode = (): boolean => process.env.E2E_MODE === 'live';

export const test = base.extend<MockedDataFixtures>({
  mockedDataEnabled: [
    async ({ page }, use): Promise<void> => {
      if (isLiveMode()) {
        await use(false);
        return;
      }

      await registerMockApiRoutes(page);
      await use(true);
    },
    { auto: true },
  ],
});

export { expect };
