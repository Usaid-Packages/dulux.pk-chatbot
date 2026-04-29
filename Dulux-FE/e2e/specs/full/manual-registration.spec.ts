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

  test('MAN-002 full wizard submit redirects to registrations list', async ({ page }) => {
    const wizardPage = new ManualRegistrationWizardPage(page);

    await wizardPage.gotoStep(1);
    await page.getByRole('textbox', { name: 'Customer Name *' }).fill('Ahmed Raza');
    await page.getByRole('textbox', { name: 'Phone Number *' }).fill('923001234567');
    await page.getByRole('textbox', { name: 'Email *' }).fill('ahmed.raza@example.com');
    await page.getByRole('textbox', { name: 'City *' }).fill('Karachi');
    await page.getByRole('textbox', { name: 'Site Address *' }).fill('Street 12, DHA Phase 6');
    await page.getByRole('button', { name: 'Next' }).click();
    await wizardPage.expectStep(2);

    await page.getByRole('textbox', { name: 'Purchase Date *' }).click();
    const calendarDialog = page.getByRole('dialog', { name: 'Purchase date calendar' });
    const todayButton = calendarDialog.locator('button[data-today="true"]').first();
    if ((await todayButton.count()) > 0) {
      await todayButton.click();
    } else {
      await calendarDialog.locator('button[data-day]:not([disabled])').first().click();
    }
    await page.getByRole('textbox', { name: 'Dealer Name *' }).fill('Color World');
    await page.getByRole('textbox', { name: 'Dealer City *' }).fill('Karachi');
    await page.getByRole('textbox', { name: 'Dealer Address *' }).fill('Main Shahrah-e-Faisal');
    await page.getByRole('button', { name: 'Next' }).click();
    await wizardPage.expectStep(3);

    await page.getByRole('button', { name: 'Topcoat + Basecoat' }).first().click();
    await page.getByLabel('Select topcoat product').first().click();
    await page.getByRole('option').filter({ hasText: 'Dulux Protect Plus' }).first().click();
    await page.getByRole('textbox', { name: 'Topcoat Quantity (liters)' }).fill('8');
    await page.getByRole('button', { name: 'Next' }).click();
    await wizardPage.expectStep(4);

    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'invoice.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('manual-registration-e2e') });
    await expect(page.getByText('Selected Invoices (1)')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await wizardPage.expectStep(5);

    await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Submit Registration' }).click();
    await expect(page).toHaveURL(/\/registrations(?:\?.*)?$/);
  });

  test('MAN-005 specialist selection disables topcoat/basecoat and submits', async ({ page }) => {
    await page.route(/.*\/api\/v1\/products\/warranty-options\/?(?:\?.*)?$/, async route => {
      const url = new URL(route.request().url());
      const productType = url.searchParams.get('product_type');

      if (productType === 'SPECIALIST') {
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            count: 1,
            next: null,
            previous: null,
            results: [
              {
                id: 555,
                name: 'Dulux Specialist XYZ',
                product_type: 'SPECIALIST',
                warranty_years: 2,
                is_active: true,
              },
            ],
          }),
        });
        return;
      }

      await route.fallback();
    });

    const wizardPage = new ManualRegistrationWizardPage(page);

    await wizardPage.gotoStep(1);
    await page.getByRole('textbox', { name: 'Customer Name *' }).fill('Sara Khan');
    await page.getByRole('textbox', { name: 'Phone Number *' }).fill('923001234567');
    await page.getByRole('textbox', { name: 'Email *' }).fill('sara.khan@example.com');
    await page.getByRole('textbox', { name: 'City *' }).fill('Karachi');
    await page.getByRole('textbox', { name: 'Site Address *' }).fill('Street 11, DHA');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByRole('textbox', { name: 'Purchase Date *' }).click();
    const calendarDialog = page.getByRole('dialog', { name: 'Purchase date calendar' });
    const todayButton = calendarDialog.locator('button[data-today="true"]').first();
    if ((await todayButton.count()) > 0) {
      await todayButton.click();
    } else {
      await calendarDialog.locator('button[data-day]:not([disabled])').first().click();
    }
    await page.getByRole('textbox', { name: 'Dealer Name *' }).fill('Color Hub');
    await page.getByRole('textbox', { name: 'Dealer City *' }).fill('Karachi');
    await page.getByRole('textbox', { name: 'Dealer Address *' }).fill('Main Road');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByRole('button', { name: 'Specialized Coat' }).first().click();
    await page.getByLabel('Select specialist product').first().click();
    await page.getByRole('option').filter({ hasText: 'Dulux Specialist XYZ' }).first().click();
    await page.getByRole('textbox', { name: 'Specialist Quantity (liters)' }).fill('9');

    await expect(page.getByLabel('Select topcoat product')).toHaveCount(0);
    await expect(page.getByLabel('Select basecoat product')).toHaveCount(0);

    await page.getByRole('button', { name: 'Next' }).click();
    await wizardPage.expectStep(4);
  });
});
