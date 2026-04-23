import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClaimDetail } from '#/hooks/claims';
import { ClaimDetailPage } from '../ClaimDetailPage';

const mockNavigate = vi.fn();
const mockHandleApprove = vi.fn();
const mockHandleReject = vi.fn();
const mockHandleSendToQuality = vi.fn();
const mockHandleClaimCsrResubmissionSubmit = vi.fn();

const mockLocation = {
  search: '?status=inReview',
};

const mockParams = {
  id: 'CLM-33',
};

const CLAIM_FIXTURE = {
  id: 'CLM-33',
  status: 'PENDING',
  workflowState: 'IN_REVIEW',
  evidencePhotos: [],
  linkedRegistration: {
    id: 'REG-33',
  },
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useParams: () => mockParams,
  };
});

vi.mock('#/components/auditLogs', () => ({
  AuditTimelinePanel: () => <div>Audit Timeline</div>,
}));

vi.mock('#/components/claims', () => ({
  ClaimImages: () => <div>Claim Images</div>,
  LinkedRegistrationCard: () => <div>Linked Registration</div>,
  ClaimWorkflowCard: ({ workflowState }: { workflowState: string }) => <div>Workflow {workflowState}</div>,
  ClaimDetailPanel: ({
    canCsrResubmit,
    canFinalApprove,
    canFinalReject,
    canSendToQuality,
    onOpenApproveModal,
    onOpenCsrResubmissionModal,
    onOpenForwardModal,
    onOpenRejectModal,
  }: {
    canCsrResubmit: boolean;
    canSendToQuality: boolean;
    canFinalApprove: boolean;
    canFinalReject: boolean;
    onOpenApproveModal: () => void;
    onOpenCsrResubmissionModal: () => void;
    onOpenForwardModal: () => void;
    onOpenRejectModal: () => void;
  }) => (
    <div>
      <p>{canCsrResubmit ? 'CSR Allowed' : 'CSR Blocked'}</p>
      <p>{canSendToQuality ? 'Forward Allowed' : 'Forward Blocked'}</p>
      <p>{canFinalApprove ? 'Approve Allowed' : 'Approve Blocked'}</p>
      <p>{canFinalReject ? 'Reject Allowed' : 'Reject Blocked'}</p>
      <button type='button' onClick={onOpenApproveModal}>
        Open Approve
      </button>
      <button type='button' onClick={onOpenCsrResubmissionModal}>
        Open CSR Resubmission
      </button>
      <button type='button' onClick={onOpenForwardModal}>
        Open Forward
      </button>
      <button type='button' onClick={onOpenRejectModal}>
        Open Reject
      </button>
    </div>
  ),
  ApproveClaimModal: ({
    isOpen,
    onSubmit,
  }: {
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (values: unknown) => void;
    claim: unknown;
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <button type='button' onClick={() => onSubmit({ notes: 'approved', voucher: 'V1' })}>
        Submit Approve
      </button>
    );
  },
  ForwardToQualityModal: ({
    isOpen,
    onSubmit,
  }: {
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (values: unknown) => void;
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <button type='button' onClick={() => onSubmit({ notes: 'send to qa' })}>
        Submit Forward
      </button>
    );
  },
  CsrResubmissionModal: ({
    isOpen,
    onSubmit,
  }: {
    claimId: string;
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (values: unknown) => void;
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <button
        type='button'
        onClick={() =>
          onSubmit({
            notes: 'need invoice',
            entries: [
              {
                requiredItem: 'invoice',
                responseText: 'attached',
                imageFile: null,
              },
            ],
          })
        }
      >
        Submit CSR
      </button>
    );
  },
  RejectClaimModal: ({
    isOpen,
    onSubmit,
  }: {
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (values: unknown) => void;
    claim: unknown;
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <button type='button' onClick={() => onSubmit({ notes: 'rejected' })}>
        Submit Reject
      </button>
    );
  },
}));

vi.mock('#/hooks/claims', () => ({
  useClaimDetail: vi.fn(),
}));

const mockedUseClaimDetail = vi.mocked(useClaimDetail);

describe('ClaimDetailPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockHandleApprove.mockReset();
    mockHandleReject.mockReset();
    mockHandleSendToQuality.mockReset();
    mockHandleClaimCsrResubmissionSubmit.mockReset();
    mockParams.id = 'CLM-33';

    mockedUseClaimDetail.mockReturnValue({
      claimQuery: {
        data: CLAIM_FIXTURE,
        isLoading: false,
        isError: false,
        error: null,
      },
      handleApprove: mockHandleApprove,
      handleClaimCsrResubmissionSubmit: mockHandleClaimCsrResubmissionSubmit,
      handleReject: mockHandleReject,
      handleSendToQuality: mockHandleSendToQuality,
      isActionPending: false,
    } as unknown as ReturnType<typeof useClaimDetail>);
  });

  it('renders detail sections and workflow permissions', () => {
    render(<ClaimDetailPage />);

    expect(screen.getByText('Claim Images')).toBeInTheDocument();
    expect(screen.getByText('Linked Registration')).toBeInTheDocument();
    expect(screen.getByText('Audit Timeline')).toBeInTheDocument();
    expect(screen.getByText('Forward Allowed')).toBeInTheDocument();
    expect(screen.getByText('CSR Blocked')).toBeInTheDocument();
    expect(screen.getByText('Approve Blocked')).toBeInTheDocument();
    expect(screen.getByText('Reject Blocked')).toBeInTheDocument();
    expect(screen.getByText('Workflow IN_REVIEW')).toBeInTheDocument();
  });

  it('renders error state and navigates back to list', () => {
    mockedUseClaimDetail.mockReturnValue({
      claimQuery: {
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Claim missing'),
      },
      handleApprove: mockHandleApprove,
      handleClaimCsrResubmissionSubmit: mockHandleClaimCsrResubmissionSubmit,
      handleReject: mockHandleReject,
      handleSendToQuality: mockHandleSendToQuality,
      isActionPending: false,
    } as unknown as ReturnType<typeof useClaimDetail>);

    render(<ClaimDetailPage />);

    expect(screen.getByText('Unable to load claim detail')).toBeInTheDocument();
    expect(screen.getByText('Claim missing')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to claims' }));

    expect(mockNavigate).toHaveBeenCalledWith('/claims?status=inReview');
  });

  it('submits approve, forward, csr, and reject actions with route id', () => {
    render(<ClaimDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Approve' }));

    fireEvent.click(screen.getByRole('button', { name: 'Open Forward' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Forward' }));

    fireEvent.click(screen.getByRole('button', { name: 'Open CSR Resubmission' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit CSR' }));

    fireEvent.click(screen.getByRole('button', { name: 'Open Reject' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Reject' }));

    expect(mockHandleApprove).toHaveBeenCalledWith({ id: 'CLM-33', notes: 'approved', voucher: 'V1' });
    expect(mockHandleSendToQuality).toHaveBeenCalledWith({ id: 'CLM-33', notes: 'send to qa' });
    expect(mockHandleClaimCsrResubmissionSubmit).toHaveBeenCalledWith({
      id: 'CLM-33',
      notes: 'need invoice',
      entries: [{ requiredItem: 'invoice', responseText: 'attached', imageFile: null }],
    });
    expect(mockHandleReject).toHaveBeenCalledWith({ id: 'CLM-33', notes: 'rejected' });
  });
});
