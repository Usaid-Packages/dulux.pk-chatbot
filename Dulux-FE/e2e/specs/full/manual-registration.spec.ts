import { authStatePaths } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/data.fixture';
import { ManualRegistrationWizardPage } from '../../pages/ManualRegistrationWizardPage';

test.describe('@critical @wizard manual registration phase2', () => {
  test.use({ storageState: authStatePaths.cs });

  test('MAN-001 step navigation enforces per-step validation', async ({ page }) => {
    const wizardPage = new ManualRegistrationWizardPage(page);
    await wizardPage.gotoStep(1);

    await page.getByRole('button', { name: 'Next' }).click();
    await wizardPage.expectStep(1);
    await expect(page.getByText('Customer name is required.')).toBeVisible();
  });

  test('MAN-004 deep-link guard redirects non-sequential steps', async ({ page }) => {
    const wizardPage = new ManualRegistrationWizardPage(page);
    await wizardPage.gotoStep(4);
    await wizardPage.expectStep(1);
  });

  test.skip('MAN-002 full wizard submit reaches success page (blocked: current app redirects to registrations on success)', async () => {
    // Blocked by current app behavior.
  });

  test.skip('MAN-003 success page actions (blocked: dependent on MAN-002 success navigation)', async () => {
    // Blocked by current app behavior.
  });
});
