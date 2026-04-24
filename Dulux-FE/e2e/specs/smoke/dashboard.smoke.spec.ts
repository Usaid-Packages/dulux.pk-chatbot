import { authStatePaths } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/data.fixture';
import { AppShellPage } from '../../pages/AppShellPage';
import { DashboardPage } from '../../pages/DashboardPage';

test.describe('@smoke dashboard smoke coverage', () => {
  test.use({ storageState: authStatePaths.admin });

  test('DASH-001 dashboard cards render and navigate to target routes', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const appShellPage = new AppShellPage(page);

    await dashboardPage.goto();
    await dashboardPage.expectModuleCardsCount(5);

    await dashboardPage.openModule('Registration Approvals');
    await appShellPage.expectPath('/registrations');
  });

  test('DASH-002 analytics sections render with mocked dataset', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.expectAnalyticsVisible();
  });

  test('DASH-002 analytics fallback state is shown when analytics endpoint fails', async ({ page }) => {
    await page.route(/.*\/api\/v1\/users\/analytics\/?(?:\?.*)?$/, async route => {
      await route.fulfill({
        status: 500,
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ detail: 'Analytics unavailable' }),
      });
    });

    await page.goto('dashboard');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText('No trend data available.')).toBeVisible();
    await expect(page.getByText('No workload data available.')).toBeVisible();
  });
});
