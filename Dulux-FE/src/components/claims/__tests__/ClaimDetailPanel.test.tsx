import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ClaimDetailPanel } from '#/components/claims/ClaimDetailPanel';
import type { ClaimDetail } from '#/types/claims.types';

const CLAIM_BASE: ClaimDetail = {
  id: '301',
  claimNumber: 'CLM-301',
  customerName: 'Areeba Khan',
  registrationId: 'REG-301',
  issueType: 'PEELING_CRACKING',
  photoCount: 0,
  submittedAt: '2026-04-02T10:00:00Z',
  workflowState: 'QA_APPROVED',
  status: 'approved',
  phone: '03001234567',
  city: 'Karachi',
  areaSqFt: 120,
  topcoat: 'Dulux Protect Plus',
  batchNumber: 'N/A',
  description: 'General claim notes.',
  evidencePhotos: [],
  timeline: [],
  linkedRegistration: {
    registrationId: 'REG-301',
    registrationRecordId: '1301',
    customerName: 'Areeba Khan',
    purchaseDate: '2026-04-01',
    dealerName: 'Paint Hub',
    status: 'SUBMITTED',
  },
};

describe('ClaimDetailPanel note labels', () => {
  it('renders Note label when qualityNotes exists', () => {
    render(
      <ClaimDetailPanel
        claim={{ ...CLAIM_BASE, csNotes: undefined, qualityNotes: 'QA approved after inspection.' }}
        onOpenApproveModal={() => undefined}
        onOpenCsrResubmissionModal={() => undefined}
        onOpenForwardModal={() => undefined}
        onOpenRejectModal={() => undefined}
        isActionPending={false}
        canCsrResubmit={false}
        canSendToQuality={false}
        canFinalApprove={false}
        canFinalReject={false}
      />
    );

    expect(screen.getByText('Note:')).toBeInTheDocument();
    expect(screen.queryByText('QA Note:')).not.toBeInTheDocument();
    expect(screen.queryByText('CS Note:')).not.toBeInTheDocument();
  });
});
