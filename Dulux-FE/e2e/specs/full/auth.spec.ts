import { authStatePaths } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/data.fixture';
import { AppShellPage } from '../../pages/AppShellPage';
import { LoginPage } from '../../pages/LoginPage';

test.describe('@critical auth regression phase2', () => {
  test('AUTH-001 login succeeds and redirects authenticated user to role home', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const appShellPage = new AppShellPage(page);

    await loginPage.goto();
    await loginPage.login({
      email: 'cs.e2e.mock@dulux.local',
      password: 'mock-cs-password',
    });

    await appShellPage.expectPath('/dashboard');
    await appShellPage.expectHeadingVisible('Dashboard');
  });

  test.describe('AUTH-002 authenticated user opening /login is redirected to role home', () => {
    test.use({ storageState: authStatePaths.quality });

    test('quality role is redirected to quality home', async ({ page }) => {
      const appShellPage = new AppShellPage(page);

      await page.goto('login');
      await appShellPage.expectPath('/quality');
      await expect(page.getByRole('heading', { name: 'Quality Review' })).toBeVisible();
    });
  });
});
