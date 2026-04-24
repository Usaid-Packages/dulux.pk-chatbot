import { authStatePaths } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/data.fixture';
import { QualityPage } from '../../pages/QualityPage';

test.describe('@critical quality phase2', () => {
  test.use({ storageState: authStatePaths.quality });

  test('QA-LIST-001 queue cards, tabs, filters, and list rendering work', async ({ page }) => {
    const qualityPage = new QualityPage(page);

    await qualityPage.goto();
    await qualityPage.expectQueueStatsVisible();
    await page.getByRole('button', { name: 'Resubmit' }).click();
    await page.getByRole('searchbox', { name: 'Search quality queue' }).fill('CLM');
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('QA-DET-001 approve/reject/request-info actions submit with success feedback', async ({ page }) => {
    await page.goto('quality/204');
    await expect(page.getByRole('heading', { name: 'Technical Assessment' })).toBeVisible();

    await page.getByRole('button', { name: 'QA Approve' }).click();
    await page.getByLabel('Technical Notes').fill('Technically validated with sufficient evidence.');
    await page.getByRole('button', { name: 'Approve Claim' }).click();
    await expect(page.getByText('Technical approval submitted.')).toBeVisible();

    await page.goto('quality/205');
    await page.getByRole('button', { name: 'Request More Info' }).click();
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Request Info' }).click();
    await expect(page.getByText('Information request sent.')).toBeVisible();

    await page.goto('quality/206');
    await page.getByRole('button', { name: 'QA Reject' }).click();
    await page.getByLabel('Technical Notes').fill('Technical rejection due to inconsistent substrate preparation.');
    await page.getByRole('button', { name: 'Reject Claim' }).click();
    await expect(page.getByText('Technical rejection submitted.')).toBeVisible();
  });

  test('QA-DET-002 decision actions are gated when state is not QA_REVIEW', async ({ page }) => {
    await page.route(/.*\/api\/v1\/warranty\/claims\/202\/?(?:\?.*)?$/, async route => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: 202,
          claim_number: 'CLM-202',
          issue_type: 'FADING',
          state: 'RESUBMIT',
          notes: 'Need additional evidence.',
          claim_date: '2026-04-21T11:00:00Z',
          created: '2026-04-21T11:00:00Z',
          modified: '2026-04-21T12:00:00Z',
          registration: {
            id: 1202,
            registration_code: 'REG-102',
            customer_name: 'Sara Ali',
            phone_number: '03007654321',
            purchase_date: '2026-01-03',
            purchase_dealer: 'Paint Hub',
            state: 'SUBMITTED',
          },
          paint_pair: { topcoat_name: 'Dulux Protect Plus' },
          images: [],
        }),
      });
    });

    await page.goto('quality/202');
    await expect(page.getByText('Quality actions are available only when claim state is QA Review.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'QA Approve' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Request More Info' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'QA Reject' })).toBeDisabled();
  });
});
