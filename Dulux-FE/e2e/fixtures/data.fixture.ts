import { expect, test as base } from '@playwright/test';

import { isLiveMode } from './live.config';
import { registerMockApiRoutes } from '../mocks/routes';

interface MockedDataFixtures {
  mockedDataEnabled: boolean;
}

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
