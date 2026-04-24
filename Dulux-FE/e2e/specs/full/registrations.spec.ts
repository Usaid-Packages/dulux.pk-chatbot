import { authStatePaths } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/data.fixture';
import { RegistrationDetailPage } from '../../pages/RegistrationDetailPage';
import { RegistrationsPage } from '../../pages/RegistrationsPage';

test.describe('@critical registrations phase2', () => {
  test.use({ storageState: authStatePaths.cs });

  test('REG-LIST-001 stats, tabs, table, and pagination render', async ({ page }) => {
    const registrationsPage = new RegistrationsPage(page);

    await registrationsPage.goto();
    await registrationsPage.expectStatsVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await registrationsPage.getTab('Pending').click();
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  });

  test('REG-LIST-002 add-manual-registration CTA routes to step 1', async ({ page }) => {
    await page.goto('registrations');
    await page.getByRole('button', { name: 'Add Manual Registration' }).click();
    await expect(page).toHaveURL(/\/manual-registration\/step\/1$/);
  });

  test('REG-LIST-003 error and empty states render correctly', async ({ page }) => {
    await page.route(/.*\/api\/v1\/warranty\/registrations\/?(?:\?.*)?$/, async route => {
      await route.fulfill({
        status: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ detail: 'Unable to fetch registrations.' }),
      });
    });

    await page.goto('registrations');
    await expect(page.getByText('Request failed with status code 500')).toBeVisible();

    await page.unroute(/.*\/api\/v1\/warranty\/registrations\/?(?:\?.*)?$/);
    await page.route(/.*\/api\/v1\/warranty\/registrations\/?(?:\?.*)?$/, async route => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
      });
    });

    await page.reload();
    await expect(page.getByText('No registrations found')).toBeVisible();
  });

  test('REG-DET-001 CS/Admin action center visible, quality role restricted', async ({ page }) => {
    const detailPage = new RegistrationDetailPage(page);
    await detailPage.goto('101');
    await expect(page.getByRole('heading', { name: 'Action Center' })).toBeVisible();

    await page.context().clearCookies();
  });

  test('REG-DET-002 approve/reject/resubmit actions submit successfully', async ({ page }) => {
    const detailPage = new RegistrationDetailPage(page);
    await detailPage.goto('101');

    await detailPage.openApproveModal();
    await detailPage.submitApprove();
    await expect(page.getByText('Registration approved successfully.')).toBeVisible();

    await detailPage.goto('104');
    await detailPage.openResubmissionModal();
    await detailPage.submitResubmissionRequest();
    await expect(page.getByText('Resubmission request sent successfully.')).toBeVisible();

    await detailPage.goto('105');
    await detailPage.openRejectModal();
    await detailPage.submitReject('Need corrected dealer details.');
    await expect(page.getByText('Registration rejected successfully.')).toBeVisible();
  });

  test('REG-DET-003 selected resubmission fields are sent in payload', async ({ page }) => {
    let capturedPayload: Record<string, unknown> | null = null;

    await page.route(/.*\/api\/v1\/warranty\/registrations\/\d+\/?(?:\?.*)?$/, async route => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        capturedPayload = request.postDataJSON() as Record<string, unknown>;
      }
      await route.fallback();
    });

    const detailPage = new RegistrationDetailPage(page);
    await detailPage.goto('106');
    await detailPage.openResubmissionModal();
    await page.getByLabel('Full Name').check();
    await page.getByLabel('Phone Number').check();
    await page.getByRole('button', { name: 'Send Request' }).click();

    await expect.poll(() => Boolean(capturedPayload)).toBeTruthy();
    expect(capturedPayload?.action).toBe('RESUBMIT');
    expect(Array.isArray(capturedPayload?.rejection_fields)).toBeTruthy();
  });

  test('REG-DET-004 invoice lightbox opens and closes', async ({ page }) => {
    const detailPage = new RegistrationDetailPage(page);
    await detailPage.goto('102');

    await page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Invoice Gallery' }) })
      .getByRole('button')
      .first()
      .click();
    await expect(page.getByRole('dialog', { name: 'Invoice' })).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog', { name: 'Invoice' })).toBeHidden();
  });
});

test.describe('@critical registrations role restrictions', () => {
  test.use({ storageState: authStatePaths.quality });

  test('REG-DET-001 quality user does not see CS action center', async ({ page }) => {
    await page.goto('registrations/101');
    await expect(page.getByRole('heading', { name: 'Action Center' })).toHaveCount(0);
  });
});
