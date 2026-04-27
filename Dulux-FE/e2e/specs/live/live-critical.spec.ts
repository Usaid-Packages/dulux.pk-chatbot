import { authStatePaths } from '../../fixtures/auth.fixture';
import { getRequiredLiveDataId, isLiveMode } from '../../fixtures/live.config';
import { expect, test } from '../../fixtures/data.fixture';
import { AppShellPage } from '../../pages/AppShellPage';
import { ClaimDetailPage } from '../../pages/ClaimDetailPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { LiveChatPage } from '../../pages/LiveChatPage';
import { ManualRegistrationWizardPage } from '../../pages/ManualRegistrationWizardPage';
import { RegistrationDetailPage } from '../../pages/RegistrationDetailPage';

const getLiveDataIdOrPlaceholder = (envVarName: Parameters<typeof getRequiredLiveDataId>[0]): string =>
  isLiveMode() ? getRequiredLiveDataId(envVarName) : 'phase4-live-placeholder';

const protectedRoutes = ['dashboard', 'claims', 'registrations'] as const;
const csBlockedRoutes = ['import'] as const;
const qualityBlockedRoutes = ['products/new', 'products/123/edit', 'import'] as const;

test.describe('@live @live-critical @critical phase4 live critical pack', () => {
  test.skip(!isLiveMode(), 'Live critical pack runs only when E2E_MODE=live.');

  test('RTE-001 unauthenticated users are redirected to /login', async ({ page }) => {
    const appShellPage = new AppShellPage(page);

    for (const route of protectedRoutes) {
      await page.goto(route);
      await appShellPage.expectPath('/login');
    }
  });

  test.describe('RTE-003 role guard for privileged routes', () => {
    test.describe('CS user', () => {
      test.use({ storageState: authStatePaths.cs });

      for (const route of csBlockedRoutes) {
        test(`RTE-003 CS user blocked from ${route}`, async ({ page }) => {
          const appShellPage = new AppShellPage(page);
          await page.goto(route);
          await appShellPage.expectPath('/dashboard');
        });
      }
    });

    test.describe('Quality user', () => {
      test.use({ storageState: authStatePaths.quality });

      for (const route of qualityBlockedRoutes) {
        test(`RTE-003 quality user blocked from ${route}`, async ({ page }) => {
          const appShellPage = new AppShellPage(page);
          await page.goto(route);
          await appShellPage.expectPath('/quality');
        });
      }
    });
  });

  test.describe('DASH-001 dashboard cards and navigation', () => {
    test.use({ storageState: authStatePaths.admin });

    test('DASH-001 dashboard module cards render and navigate', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      const appShellPage = new AppShellPage(page);

      await dashboardPage.goto();
      await dashboardPage.expectModuleCardsCount(5);
      await dashboardPage.openModule('Registration Approvals');
      await appShellPage.expectPath('/registrations');
    });
  });

  test.describe('REG-DET-002 registration decision actions', () => {
    test.use({ storageState: authStatePaths.cs });

    test('REG-DET-002 approve registration succeeds', async ({ page }) => {
      const regApproveId = getLiveDataIdOrPlaceholder('E2E_LIVE_REG_APPROVE_ID');
      const detailPage = new RegistrationDetailPage(page);
      await detailPage.goto(regApproveId);
      await detailPage.openApproveModal();
      await detailPage.submitApprove();
      await expect(page.getByText('Registration approved successfully.')).toBeVisible();
    });

    test('REG-DET-002 resubmission request succeeds', async ({ page }) => {
      const regResubmitId = getLiveDataIdOrPlaceholder('E2E_LIVE_REG_RESUBMIT_ID');
      const detailPage = new RegistrationDetailPage(page);
      await detailPage.goto(regResubmitId);
      await detailPage.openResubmissionModal();
      await detailPage.submitResubmissionRequest();
      await expect(page.getByText('Resubmission request sent successfully.')).toBeVisible();
    });

    test('REG-DET-002 reject registration succeeds', async ({ page }) => {
      const regRejectId = getLiveDataIdOrPlaceholder('E2E_LIVE_REG_REJECT_ID');
      const detailPage = new RegistrationDetailPage(page);
      await detailPage.goto(regRejectId);
      await detailPage.openRejectModal();
      await detailPage.submitReject('Rejected during live phase4 critical validation.');
      await expect(page.getByText('Registration rejected successfully.')).toBeVisible();
    });
  });

  test.describe('CLM-DET-003 claim transition actions', () => {
    test.use({ storageState: authStatePaths.cs });

    test('CLM-DET-003 send-to-quality action succeeds', async ({ page }) => {
      const claimForwardId = getLiveDataIdOrPlaceholder('E2E_LIVE_CLAIM_FORWARD_ID');
      const detailPage = new ClaimDetailPage(page);
      await detailPage.goto(claimForwardId);
      await detailPage.openForwardToQualityModal();
      await detailPage.submitForwardToQuality('Forwarding for live phase4 quality validation.');
      await expect(page.getByText('Claim forwarded to Quality team.')).toBeVisible();
    });

    test('CLM-DET-003 CSR resubmission action succeeds', async ({ page }) => {
      const claimCsrResubmitId = getLiveDataIdOrPlaceholder('E2E_LIVE_CLAIM_CSR_RESUBMIT_ID');
      const detailPage = new ClaimDetailPage(page);
      await detailPage.goto(claimCsrResubmitId);
      await detailPage.openCsrResubmissionModal();
      await detailPage.submitCsrResubmission('CSR follow-up captured during live phase4.');
      await expect(page.getByText('CSR response submitted to Quality.')).toBeVisible();
    });
  });

  test.describe('QA-DET-001 quality decisions', () => {
    test.use({ storageState: authStatePaths.quality });

    test('QA-DET-001 approve action succeeds', async ({ page }) => {
      const qualityApproveId = getLiveDataIdOrPlaceholder('E2E_LIVE_QUALITY_APPROVE_ID');
      await page.goto(`quality/${qualityApproveId}`);
      await page.getByRole('button', { name: 'QA Approve' }).click();
      await page.getByLabel('Technical Notes').fill('Approved during phase4 live critical run.');
      await page.getByRole('button', { name: 'Approve Claim' }).click();
      await expect(page.getByText('Technical approval submitted.')).toBeVisible();
    });

    test('QA-DET-001 request-more-info action succeeds', async ({ page }) => {
      const qualityRequestInfoId = getLiveDataIdOrPlaceholder('E2E_LIVE_QUALITY_REQUEST_INFO_ID');
      await page.goto(`quality/${qualityRequestInfoId}`);
      await page.getByRole('button', { name: 'Request More Info' }).click();
      await page.getByRole('checkbox').first().check();
      await page.getByRole('button', { name: 'Request Info' }).click();
      await expect(page.getByText('Information request sent.')).toBeVisible();
    });

    test('QA-DET-001 reject action succeeds', async ({ page }) => {
      const qualityRejectId = getLiveDataIdOrPlaceholder('E2E_LIVE_QUALITY_REJECT_ID');
      await page.goto(`quality/${qualityRejectId}`);
      await page.getByRole('button', { name: 'QA Reject' }).click();
      await page.getByLabel('Technical Notes').fill('Rejected during phase4 live critical run.');
      await page.getByRole('button', { name: 'Reject Claim' }).click();
      await expect(page.getByText('Technical rejection submitted.')).toBeVisible();
    });
  });

  test.describe('CHAT-003 complaint resolve flow', () => {
    test.use({ storageState: authStatePaths.cs });

    test('CHAT-003 resolve/close flow succeeds with closure note', async ({ page }) => {
      const complaintThreadId = getLiveDataIdOrPlaceholder('E2E_LIVE_COMPLAINT_THREAD_ID');
      const liveChatPage = new LiveChatPage(page);
      await liveChatPage.gotoThread(complaintThreadId);
      await liveChatPage.expectTicketHeading(complaintThreadId);
      await liveChatPage.openResolveModal();
      await liveChatPage.resolveConversation('Resolved during phase4 live critical run.');
      await expect(page.getByText('Complaint closed successfully.')).toBeVisible();
      await expect(page.getByText('Conversation is resolved.')).toBeVisible();
    });
  });

  test.describe('MAN-002 manual wizard submit flow', () => {
    test.use({ storageState: authStatePaths.cs });

    test.skip(
      'MAN-002 full wizard submit redirects to registrations list (pending full wizard data-entry automation)',
      async ({ page }) => {
        const wizardPage = new ManualRegistrationWizardPage(page);
        await wizardPage.gotoStep(1);
      }
    );
  });
});
