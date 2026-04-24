import { authStatePaths } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/data.fixture';

test.describe('@critical resilience phase2', () => {
  test.use({ storageState: authStatePaths.cs });

  test('HARD-001 list pages handle loading/empty/error contracts', async ({ page }) => {
    await page.route(/.*\/api\/v1\/warranty\/claims\/?(?:\?.*)?$/, async route => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
      });
    });

    await page.goto('claims');
    await expect(page.getByText('No claims found')).toBeVisible();

    await page.unroute(/.*\/api\/v1\/warranty\/claims\/?(?:\?.*)?$/);
    await page.route(/.*\/api\/v1\/products\/?(?:\?.*)?$/, async route => {
      if (route.request().url().includes('/surface-types') || route.request().url().includes('/warranty-options')) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ detail: 'Products unavailable.' }),
      });
    });

    await page.goto('products');
    await expect(page.getByText('Failed to load products')).toBeVisible();
  });

  test('HARD-002 failed mutation shows error feedback and keeps UI stable', async ({ page }) => {
    await page.route(/.*\/api\/v1\/warranty\/claims\/202\/?(?:\?.*)?$/, async route => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ detail: 'Mutation failed.' }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('claims/202');
    await page.getByRole('button', { name: 'Send To Quality' }).click();
    await page.getByLabel('CS Notes').fill('Forwarding note');
    await page.getByRole('button', { name: 'Forward' }).click();

    await expect(page.getByText('Mutation failed.')).toBeVisible();
    await expect(page.getByText('Claim Profile')).toBeVisible();
  });

  test('HARD-003 schema validation blocks invalid form submissions', async ({ page }) => {
    await page.goto('products/new');
    await page.getByRole('button', { name: 'Create Product' }).click();
    await expect(page.getByText('Product name is required.')).toBeVisible();
    await expect(page.getByText('Select at least one surface type.')).toBeVisible();
  });
});

test.describe('@critical rbac component protections phase2', () => {
  test.use({ storageState: authStatePaths.quality });

  test('HARD-005 unauthorized role cannot use CS registration action center', async ({ page }) => {
    await page.goto('registrations/101');
    await expect(page.getByRole('heading', { name: 'Action Center' })).toHaveCount(0);
  });
});
