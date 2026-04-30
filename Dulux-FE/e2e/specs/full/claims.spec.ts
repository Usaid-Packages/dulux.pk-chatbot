import { authStatePaths } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/data.fixture';
import { ClaimDetailPage } from '../../pages/ClaimDetailPage';
import { ClaimsPage } from '../../pages/ClaimsPage';

test.describe('@critical claims phase2 (cs)', () => {
  test.use({ storageState: authStatePaths.cs });

  test('CLM-LIST-001 stats, filters, table and pagination render', async ({ page }) => {
    const claimsPage = new ClaimsPage(page);

    await claimsPage.goto();
    await claimsPage.expectStatsVisible();
    await claimsPage.getSearchInput().fill('REG-101');
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  });

  test('CLM-LIST-002 create-claim query param opens modal and closes with URL cleanup', async ({ page }) => {
    await page.goto('claims?createClaim=1');
    await expect(page.getByRole('dialog', { name: 'Add New Claim' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/claims(?:\?.*)?$/);
    await expect(page).not.toHaveURL(/createClaim=1/);
  });

  test('CLM-DET-002 SUBMITTED claim triggers IN_REVIEW transition once', async ({ page }) => {
    let inReviewActionCount = 0;

    await page.route(/.*\/api\/v1\/warranty\/claims\/\d+\/?(?:\?.*)?$/, async route => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        const payload = request.postDataJSON() as Record<string, unknown>;
        if (payload.action === 'IN_REVIEW') {
          inReviewActionCount += 1;
        }
      }
      await route.fallback();
    });

    const detailPage = new ClaimDetailPage(page);
    await detailPage.goto('201');
    await expect(page.getByText('Claim Profile')).toBeVisible();
    await expect.poll(() => inReviewActionCount).toBe(1);
  });

  test('CLM-DET-003 send-to-quality and CSR-resubmission submit expected payload flows', async ({ page }) => {
    let forwardedPayload: Record<string, unknown> | null = null;
    let csrPayload: Record<string, unknown> | null = null;

    await page.route(/.*\/api\/v1\/warranty\/claims\/\d+\/?(?:\?.*)?$/, async route => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        forwardedPayload = request.postDataJSON() as Record<string, unknown>;
      }
      await route.fallback();
    });

    await page.route(/.*\/api\/v1\/warranty\/claims\/\d+\/csr-resubmission\/?(?:\?.*)?$/, async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        csrPayload = request.postDataJSON() as Record<string, unknown>;
      }
      await route.fallback();
    });

    const detailPage = new ClaimDetailPage(page);
    await detailPage.goto('202');
    await detailPage.openForwardToQualityModal();
    await detailPage.submitForwardToQuality('Forwarding for QA review.');
    await expect.poll(() => forwardedPayload?.action).toBe('QA_REVIEW');

    await page.goto('claims/203');
    await detailPage.openCsrResubmissionModal();
    await page.getByPlaceholder('Enter customer response...').fill('Customer submitted site details.');
    await page.getByRole('button', { name: 'Submit To QA' }).click();
    await expect.poll(() => Boolean(csrPayload)).toBeTruthy();
  });
});

test.describe('@critical claims phase2 (admin)', () => {
  test.use({ storageState: authStatePaths.admin });

  test('CLM-DET-001 detail sections render (detail, workflow, images, timeline)', async ({ page }) => {
    const claimsPage = new ClaimsPage(page);

    await claimsPage.goto();
    await claimsPage.openFirstDetail();
    await expect(page.getByText('Claim Profile')).toBeVisible();
    await expect(page.getByText('Action Center')).toBeVisible();
    await expect(page.getByText('Claim Workflow')).toBeVisible();
    await expect(page.getByText('Latest Timeline Changes')).toBeVisible();
  });

  test('CLM-DET-004 QA-approved claim voucher upload accepts PDF only', async ({ page }) => {
    await page.route(/.*\/api\/v1\/warranty\/claims\/205\/?(?:\?.*)?$/, async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }

      const response = await route.fetch();
      const claimDetail = (await response.json()) as Record<string, unknown>;
      claimDetail.state = 'QA_APPROVED';

      await route.fulfill({
        response,
        body: JSON.stringify(claimDetail),
        headers: {
          ...response.headers(),
          'content-type': 'application/json',
        },
      });
    });

    await page.goto('claims/205');
    await page.getByRole('button', { name: 'Final Approve' }).click();
    await expect(page.getByRole('dialog', { name: 'Final Approve Claim' })).toBeVisible();
    await expect(page.getByLabel('Voucher File *')).toHaveAttribute('accept', '.pdf');
  });
});
