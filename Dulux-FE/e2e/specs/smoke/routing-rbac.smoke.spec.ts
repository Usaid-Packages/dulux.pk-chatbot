import { authStatePaths } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/data.fixture';
import { AppShellPage } from '../../pages/AppShellPage';

const protectedRoutes = ['dashboard', 'claims', 'registrations'] as const;
const csBlockedRoutes = ['import', 'settings'] as const;
const qualityBlockedRoutes = ['products/new', 'products/123/edit', 'import', 'settings'] as const;

test.describe('@smoke @rbac routing-rbac smoke coverage', () => {
  test('RTE-001 unauthenticated users are redirected to /login', async ({ page }) => {
    const appShellPage = new AppShellPage(page);

    for (const route of protectedRoutes) {
      await page.goto(route);
      await appShellPage.expectPath('/login');
    }
  });

  test.describe('RTE-002 root redirect', () => {
    test.use({ storageState: authStatePaths.admin });

    test('authenticated admin root route redirects to dashboard', async ({ page }) => {
      const appShellPage = new AppShellPage(page);

      await page.goto('');
      await appShellPage.expectPath('/dashboard');
      await appShellPage.expectHeadingVisible('Dashboard');
    });
  });

  test.describe('RTE-002 root redirect for quality role', () => {
    test.use({ storageState: authStatePaths.quality });

    test('authenticated quality root route redirects to quality home', async ({ page }) => {
      const appShellPage = new AppShellPage(page);

      await page.goto('');
      await appShellPage.expectPath('/quality');
      await expect(page.getByRole('heading', { name: 'Quality Review' })).toBeVisible();
    });
  });

  test.describe('RTE-003 role guard for privileged routes', () => {
    test.describe('CS user', () => {
      test.use({ storageState: authStatePaths.cs });

      for (const route of csBlockedRoutes) {
        test(`CS user is blocked from ${route}`, async ({ page }) => {
          const appShellPage = new AppShellPage(page);

          await page.goto(route);
          await appShellPage.expectPath('/dashboard');
        });
      }
    });

    test.describe('Quality user', () => {
      test.use({ storageState: authStatePaths.quality });

      for (const route of qualityBlockedRoutes) {
        test(`Quality user is blocked from ${route}`, async ({ page }) => {
          const appShellPage = new AppShellPage(page);

          await page.goto(route);
          await appShellPage.expectPath('/quality');
        });
      }
    });
  });
});
