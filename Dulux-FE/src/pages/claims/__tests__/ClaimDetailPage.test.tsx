import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClaimDetail } from '#/hooks/claims';
import { ClaimDetailPage } from '../ClaimDetailPage';

const mockNavigate = vi.fn();
const mockHandleApprove = vi.fn();

let routeId = '42';
let routeSearch = '?status=inReview';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: routeId }),
    useLocation: () => ({ search: routeSearch }),
  };
});

vi.mock('#/components/auditLogs', () => ({
  AuditTimelinePanel: () => <div>Audit Timeline</div>,
}));

vi.mock('#/components/claims', () => ({
  ClaimImages: () => <div>Claim Images</div>,
  LinkedRegistrationCard: () => <div>Linked Registration</div>,
  ClaimWorkflowCard: () => <div>Claim Workflow</div>,
  ClaimDetailPanel: ({ onOpenApproveModal }: { onOpenApproveModal: () => void }) => (
    <button type='button' onClick={onOpenApproveModal}>
      Open Approve Modal
    </button>
  ),
  ApproveClaimModal: ({
    isOpen,
    onSubmit,
  }: {
    isOpen: boolean;
    onSubmit: (values: { notes: string; voucher: string }) => void;
  }) =>
    isOpen ? (
      <button type='button' onClick={() => onSubmit({ notes: 'ok', voucher: 'V-1' })}>
        Submit Approve
      </button>
    ) : null,
  ForwardToQualityModal: () => null,
  CsrResubmissionModal: () => null,
  RejectClaimModal: () => null,
}));

vi.mock('#/hooks/claims', () => ({
  useClaimDetail: vi.fn(),
}));

const mockedUseClaimDetail = vi.mocked(useClaimDetail);

describe('ClaimDetailPage', () => {
  beforeEach(() => {
    routeId = '42';
    routeSearch = '?status=inReview';
    mockNavigate.mockReset();
    mockHandleApprove.mockReset();

    mockedUseClaimDetail.mockReturnValue({
      claimQuery: {
        isLoading: false,
        isError: false,
        data: {
          status: 'PENDING',
          workflowState: 'QA_APPROVED',
          evidencePhotos: [],
          linkedRegistration: null,
        },
      },
      handleApprove: mockHandleApprove,
      handleClaimCsrResubmissionSubmit: vi.fn(),
      handleReject: vi.fn(),
      handleSendToQuality: vi.fn(),
      isActionPending: false,
    } as unknown as ReturnType<typeof useClaimDetail>);
  });

  it('renders error state and navigates back', () => {
    mockedUseClaimDetail.mockReturnValue({
      claimQuery: {
        isLoading: false,
        isError: true,
        data: null,
        error: new Error('Claim load failed'),
      },
      handleApprove: mockHandleApprove,
      handleClaimCsrResubmissionSubmit: vi.fn(),
      handleReject: vi.fn(),
      handleSendToQuality: vi.fn(),
      isActionPending: false,
    } as unknown as ReturnType<typeof useClaimDetail>);

    render(<ClaimDetailPage />);

    expect(screen.getByText('Unable to load claim detail')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to claims' }));

    expect(mockNavigate).toHaveBeenCalledWith('/claims?status=inReview');
  });

  it('opens approve modal and submits approve action', () => {
    render(<ClaimDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Approve Modal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Approve' }));

    expect(mockHandleApprove).toHaveBeenCalledWith({ id: '42', notes: 'ok', voucher: 'V-1' });
  });
});
