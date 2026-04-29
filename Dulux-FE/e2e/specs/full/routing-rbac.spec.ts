import { authStatePaths } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/data.fixture';
import { AppShellPage } from '../../pages/AppShellPage';

test.describe('@critical @rbac routing regression phase3', () => {
  test.describe('RTE-004 deep-link detail routes', () => {
    test.use({ storageState: authStatePaths.cs });

    test('CS deep-links to registrations, claims, complaints and back-navigation returns to list routes', async ({ page }) => {
      const appShellPage = new AppShellPage(page);

      await page.goto('registrations');
      await page.goto('registrations/101');
      await expect(page.getByRole('heading', { name: 'Action Center' })).toBeVisible();
      await page.goBack();
      await appShellPage.expectPath('/registrations');

      await page.goto('claims');
      await page.goto('claims/201');
      await expect(page.getByText('Claim Profile')).toBeVisible();
      await page.goBack();
      await appShellPage.expectPath('/claims');

      await page.goto('complaints');
      await page.goto('complaints/cmp-1');
      await expect(page.getByRole('heading', { name: 'Ticket #cmp-1' })).toBeVisible();
    });

    test.describe('Quality detail deep-link', () => {
      test.use({ storageState: authStatePaths.quality });

      test('Quality user can open quality detail route directly', async ({ page }) => {
        await page.goto('quality/204');
        await expect(page.getByRole('heading', { name: 'Technical Assessment' })).toBeVisible();
      });
    });
  });

  test.describe('RTE-005 manual wizard route behavior', () => {
    test.use({ storageState: authStatePaths.cs });

    test('manual-registration root redirects to step 1', async ({ page }) => {
      await page.goto('manual-registration');
      await expect(page).toHaveURL(/\/manual-registration\/step\/1(?:\?.*)?$/);
    });

    test('non-sequential deep-link step is guarded and redirected to step 1', async ({ page }) => {
      await page.goto('manual-registration/step/4');
      await expect(page).toHaveURL(/\/manual-registration\/step\/1(?:\?.*)?$/);
    });
  });

  test.describe('RTE-006 catch-all routing behavior', () => {
    test('unauthenticated unknown route redirects to /login', async ({ page }) => {
      const appShellPage = new AppShellPage(page);
      await page.goto('not-a-real-route');
      await appShellPage.expectPath('/login');
    });

    test.describe('authenticated route fallback', () => {
      test.use({ storageState: authStatePaths.cs });

      test('authenticated unknown route redirects to role home', async ({ page }) => {
        const appShellPage = new AppShellPage(page);
        await page.goto('definitely-unknown-for-phase3');
        await appShellPage.expectPath('/dashboard');
      });
    });
  });
});
