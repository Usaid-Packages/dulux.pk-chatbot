import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthContext } from '#/context';
import { useClaimDetail } from '#/hooks/claims';
import { ClaimDetailPage } from '../ClaimDetailPage';

const mockNavigate = vi.fn();
const mockHandleApprove = vi.fn();
const mockHandleReject = vi.fn();
const mockHandleSendToQuality = vi.fn();
const mockHandleClaimCsrResubmissionSubmit = vi.fn();
const mockHandleQaApprove = vi.fn();
const mockHandleQaReject = vi.fn();
const mockHandleQaRequestInfo = vi.fn();

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

vi.mock('#/context', () => ({
  useAuthContext: vi.fn(),
}));

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
    canQaApprove,
    canQaReject,
    canQaRequestInfo,
    canSendToQuality,
    onOpenApproveModal,
    onOpenCsrResubmissionModal,
    onOpenForwardModal,
    onOpenQaApproveModal,
    onOpenQaRejectModal,
    onOpenQaRequestInfoModal,
    onOpenRejectModal,
  }: {
    canCsrResubmit: boolean;
    canSendToQuality: boolean;
    canFinalApprove: boolean;
    canFinalReject: boolean;
    canQaApprove: boolean;
    canQaReject: boolean;
    canQaRequestInfo: boolean;
    onOpenApproveModal: () => void;
    onOpenCsrResubmissionModal: () => void;
    onOpenForwardModal: () => void;
    onOpenQaApproveModal: () => void;
    onOpenQaRejectModal: () => void;
    onOpenQaRequestInfoModal: () => void;
    onOpenRejectModal: () => void;
  }) => (
    <div>
      <p>{canCsrResubmit ? 'CSR Allowed' : 'CSR Blocked'}</p>
      <p>{canSendToQuality ? 'Forward Allowed' : 'Forward Blocked'}</p>
      <p>{canFinalApprove ? 'Approve Allowed' : 'Approve Blocked'}</p>
      <p>{canFinalReject ? 'Reject Allowed' : 'Reject Blocked'}</p>
      <p>{canQaApprove ? 'QA Approve Allowed' : 'QA Approve Blocked'}</p>
      <p>{canQaRequestInfo ? 'QA Request Info Allowed' : 'QA Request Info Blocked'}</p>
      <p>{canQaReject ? 'QA Reject Allowed' : 'QA Reject Blocked'}</p>
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
      <button type='button' onClick={onOpenQaApproveModal}>
        Open QA Approve
      </button>
      <button type='button' onClick={onOpenQaRequestInfoModal}>
        Open QA Request Info
      </button>
      <button type='button' onClick={onOpenQaRejectModal}>
        Open QA Reject
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

vi.mock('#/components/quality', () => ({
  ApproveClaimModal: ({
    isOpen,
    onSubmit,
  }: {
    isOpen: boolean;
    onSubmit: (values: { technicalNotes: string }) => void;
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <button type='button' onClick={() => onSubmit({ technicalNotes: 'Approved by QA' })}>
        Submit QA Approve
      </button>
    );
  },
  RejectClaimQAModal: ({
    isOpen,
    onSubmit,
  }: {
    isOpen: boolean;
    onSubmit: (values: { technicalReason: 'OTHER'; technicalNotes: string }) => void;
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <button type='button' onClick={() => onSubmit({ technicalReason: 'OTHER', technicalNotes: 'Rejected by QA' })}>
        Submit QA Reject
      </button>
    );
  },
  RequestInfoQAModal: ({
    isOpen,
    onSubmit,
  }: {
    isOpen: boolean;
    onSubmit: (values: { requiredItems: ['ADDITIONAL_PHOTOS_DIFFERENT_ANGLES']; notes: string }) => void;
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <button
        type='button'
        onClick={() =>
          onSubmit({
            requiredItems: ['ADDITIONAL_PHOTOS_DIFFERENT_ANGLES'],
            notes: 'Need more QA evidence',
          })
        }
      >
        Submit QA Request Info
      </button>
    );
  },
  QualityResubmissionCard: ({ latestResubmission }: { latestResubmission?: { id: string } }) =>
    latestResubmission ? <div>Latest Resubmission Card</div> : null,
}));

vi.mock('#/hooks/claims', () => ({
  useClaimDetail: vi.fn(),
}));

const mockedUseClaimDetail = vi.mocked(useClaimDetail);
const mockedUseAuthContext = vi.mocked(useAuthContext);

describe('ClaimDetailPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockHandleApprove.mockReset();
    mockHandleReject.mockReset();
    mockHandleSendToQuality.mockReset();
    mockHandleClaimCsrResubmissionSubmit.mockReset();
    mockHandleQaApprove.mockReset();
    mockHandleQaReject.mockReset();
    mockHandleQaRequestInfo.mockReset();
    mockParams.id = 'CLM-33';

    mockedUseAuthContext.mockReturnValue({
      token: 'token-123',
      user: { role: 'admin' },
    } as unknown as ReturnType<typeof useAuthContext>);

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
      handleQaApprove: mockHandleQaApprove,
      handleQaReject: mockHandleQaReject,
      handleQaRequestInfo: mockHandleQaRequestInfo,
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
    expect(screen.getByText('QA Approve Blocked')).toBeInTheDocument();
    expect(screen.getByText('QA Request Info Blocked')).toBeInTheDocument();
    expect(screen.getByText('QA Reject Blocked')).toBeInTheDocument();
    expect(screen.getByText('Workflow IN_REVIEW')).toBeInTheDocument();
    expect(screen.queryByText('Latest Resubmission Card')).not.toBeInTheDocument();
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
      handleQaApprove: mockHandleQaApprove,
      handleQaReject: mockHandleQaReject,
      handleQaRequestInfo: mockHandleQaRequestInfo,
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

  it('allows admin users to submit QA review actions from claim detail during QA review', () => {
    mockedUseClaimDetail.mockReturnValue({
      claimQuery: {
        data: {
          ...CLAIM_FIXTURE,
          workflowState: 'QA_REVIEW',
        },
        isLoading: false,
        isError: false,
        error: null,
      },
      handleApprove: mockHandleApprove,
      handleClaimCsrResubmissionSubmit: mockHandleClaimCsrResubmissionSubmit,
      handleReject: mockHandleReject,
      handleQaApprove: mockHandleQaApprove,
      handleQaReject: mockHandleQaReject,
      handleQaRequestInfo: mockHandleQaRequestInfo,
      handleSendToQuality: mockHandleSendToQuality,
      isActionPending: false,
    } as unknown as ReturnType<typeof useClaimDetail>);

    render(<ClaimDetailPage />);

    expect(screen.getByText('QA Approve Allowed')).toBeInTheDocument();
    expect(screen.getByText('QA Request Info Allowed')).toBeInTheDocument();
    expect(screen.getByText('QA Reject Allowed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open QA Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit QA Approve' }));

    fireEvent.click(screen.getByRole('button', { name: 'Open QA Request Info' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit QA Request Info' }));

    fireEvent.click(screen.getByRole('button', { name: 'Open QA Reject' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit QA Reject' }));

    expect(mockHandleQaApprove).toHaveBeenCalledWith({ id: 'CLM-33', technicalNotes: 'Approved by QA' });
    expect(mockHandleQaRequestInfo).toHaveBeenCalledWith({
      id: 'CLM-33',
      requiredItems: ['ADDITIONAL_PHOTOS_DIFFERENT_ANGLES'],
      notes: 'Need more QA evidence',
    });
    expect(mockHandleQaReject).toHaveBeenCalledWith({
      id: 'CLM-33',
      technicalReason: 'OTHER',
      technicalNotes: 'Rejected by QA',
    });
  });

  it('shows the latest resubmission block when claim detail includes latest resubmission data', () => {
    mockedUseClaimDetail.mockReturnValue({
      claimQuery: {
        data: {
          ...CLAIM_FIXTURE,
          latestResubmission: {
            id: '24',
            source: 'COMPLAINT',
            notes: '',
            createdAt: '2026-05-19T09:39:25.457628Z',
            entries: [
              {
                id: '51',
                requiredItem: 'CLOSE_UP_DAMAGE_PHOTOS',
                responseText: '',
                imageUrl: 'https://example.com/resubmission-1.webp',
                createdAt: '2026-05-19T09:39:25.459645Z',
              },
            ],
          },
        },
        isLoading: false,
        isError: false,
        error: null,
      },
      handleApprove: mockHandleApprove,
      handleClaimCsrResubmissionSubmit: mockHandleClaimCsrResubmissionSubmit,
      handleReject: mockHandleReject,
      handleQaApprove: mockHandleQaApprove,
      handleQaReject: mockHandleQaReject,
      handleQaRequestInfo: mockHandleQaRequestInfo,
      handleSendToQuality: mockHandleSendToQuality,
      isActionPending: false,
    } as unknown as ReturnType<typeof useClaimDetail>);

    render(<ClaimDetailPage />);

    expect(screen.getByText('Latest Resubmission Card')).toBeInTheDocument();
  });
});
