import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApproveClaimModal } from '#/components/claims';
import { CLAIM_VOUCHER_ACCEPT, CLAIM_VOUCHER_FILE_TYPE_MESSAGE } from '#/constants';
import type { ApproveClaimFinalFormValues } from '#/schemas/claim.schema';
import type { ClaimDetail } from '#/types/claims.types';

const CLAIM_FIXTURE: ClaimDetail = {
  id: '205',
  claimNumber: 'CLM-205',
  customerName: 'Kamran Malik',
  registrationId: 'REG-105',
  issueType: 'COLOR_FADING',
  photoCount: 2,
  submittedAt: '2026-04-22T11:00:00Z',
  workflowState: 'QA_APPROVED',
  status: 'approved',
  phone: '03001234567',
  city: 'Lahore',
  areaSqFt: 120,
  topcoat: 'Dulux Protect Plus',
  batchNumber: 'BT-205',
  description: 'Color tone variation after drying.',
  evidencePhotos: [],
  timeline: [],
  linkedRegistration: {
    registrationId: 'REG-105',
    registrationRecordId: '1105',
    customerName: 'Kamran Malik',
    purchaseDate: '2026-01-03',
    dealerName: 'Paint Hub',
    status: 'SUBMITTED',
  },
};

describe('ApproveClaimModal', () => {
  it('accepts only PDF file type in voucher input', () => {
    render(
      <ApproveClaimModal
        isOpen
        isSubmitting={false}
        claim={CLAIM_FIXTURE}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />
    );

    expect(screen.getByLabelText(/voucher file/i)).toHaveAttribute('accept', CLAIM_VOUCHER_ACCEPT);
  });

  it('shows validation error when a non-PDF voucher is submitted', async () => {
    const user = userEvent.setup();

    render(
      <ApproveClaimModal
        isOpen
        isSubmitting={false}
        claim={CLAIM_FIXTURE}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />
    );

    const voucherInput = screen.getByLabelText(/voucher file/i);
    const pngVoucher = new File(['voucher'], 'voucher.png', { type: 'image/png' });
    await user.upload(voucherInput, pngVoucher);
    await user.click(screen.getByRole('button', { name: 'Final Approve Claim' }));

    expect(screen.getByText(CLAIM_VOUCHER_FILE_TYPE_MESSAGE)).toBeInTheDocument();
  });

  it('submits when voucher is a PDF file', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn<(values: ApproveClaimFinalFormValues) => void>();

    render(
      <ApproveClaimModal
        isOpen
        isSubmitting={false}
        claim={CLAIM_FIXTURE}
        onClose={() => undefined}
        onSubmit={handleSubmit}
      />
    );

    const voucherInput = screen.getByLabelText(/voucher file/i);
    const pdfVoucher = new File(['voucher'], 'voucher.pdf', { type: 'application/pdf' });
    await user.upload(voucherInput, pdfVoucher);
    await user.click(screen.getByRole('button', { name: 'Final Approve Claim' }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        voucher: pdfVoucher,
      })
    );
  });
});
