import { authStatePaths } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/data.fixture';

test.describe('@critical import and settings phase2', () => {
  test.use({ storageState: authStatePaths.admin });

  test.skip('IMP-001 import placeholder shell route for allowed role (blocked: route not present in current router)', async ({
    page,
  }) => {
    await page.goto('import');
    await expect(page).toHaveURL(/\/import(?:\?.*)?$/);
  });

  test.skip('SET-001 settings placeholder/admin restrictions (blocked: route not present in current router)', async ({
    page,
  }) => {
    await page.goto('settings');
    await expect(page).toHaveURL(/\/settings(?:\?.*)?$/);
  });
});
