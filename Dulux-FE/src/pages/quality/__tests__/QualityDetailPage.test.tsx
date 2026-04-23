import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useQualityDetail } from '#/hooks/quality';
import { QualityDetailPage } from '../QualityDetailPage';

const mockNavigate = vi.fn();
const mockHandleApprove = vi.fn();
<<<<<<< test/test-auth-quality-page
const mockHandleReject = vi.fn();
const mockHandleRequestInfo = vi.fn();

const mockParams = { id: '55' };
const mockLocation = { search: '?status=forwarded' };
=======

let routeId = '88';
let routeSearch = '?status=forwarded';
>>>>>>> test/all-test-cases

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
<<<<<<< test/test-auth-quality-page
    useParams: () => mockParams,
    useLocation: () => mockLocation,
=======
    useParams: () => ({ id: routeId }),
    useLocation: () => ({ search: routeSearch }),
>>>>>>> test/all-test-cases
  };
});

vi.mock('#/components/auditLogs', () => ({
  AuditTimelinePanel: () => <div>Audit Timeline</div>,
}));

vi.mock('#/components/claims', () => ({
<<<<<<< test/test-auth-quality-page
  ClaimWorkflowCard: ({ workflowState }: { workflowState: string }) => <div>Workflow: {workflowState}</div>,
=======
  ClaimWorkflowCard: () => <div>Workflow Card</div>,
>>>>>>> test/all-test-cases
  LinkedRegistrationCard: () => <div>Linked Registration</div>,
}));

vi.mock('#/components/quality', () => ({
<<<<<<< test/test-auth-quality-page
  QualityDecisionPanel: ({
    canTakeDecision,
    onOpenApproveModal,
    onOpenRequestInfoModal,
    onOpenRejectModal,
  }: {
    canTakeDecision: boolean;
    onOpenApproveModal: () => void;
    onOpenRequestInfoModal: () => void;
    onOpenRejectModal: () => void;
  }) => (
    <section>
      <p>Can Take Decision: {canTakeDecision ? 'Yes' : 'No'}</p>
      <button type='button' onClick={onOpenApproveModal}>
        Open Approve
      </button>
      <button type='button' onClick={onOpenRequestInfoModal}>
        Open Request Info
      </button>
      <button type='button' onClick={onOpenRejectModal}>
        Open Reject
      </button>
    </section>
  ),
=======
  QualityAgentNotesCard: () => <div>Agent Notes</div>,
  QualityDecisionPanel: ({ onOpenApproveModal }: { onOpenApproveModal: () => void }) => (
    <button type='button' onClick={onOpenApproveModal}>
      Open QA Approve
    </button>
  ),
  QualityEvidencePhotos: () => <div>Evidence Photos</div>,
  QualityQuickInfoCard: () => <div>Quick Info</div>,
  QualityResubmissionCard: () => <div>Resubmission</div>,
>>>>>>> test/all-test-cases
  ApproveClaimModal: ({
    isOpen,
    onSubmit,
  }: {
    isOpen: boolean;
<<<<<<< test/test-auth-quality-page
    onSubmit: (values: { technicalNotes: string }) => void;
  }) => {
    if (!isOpen) {
      return null;
    }

    const handleSubmit = (): void => {
      onSubmit({ technicalNotes: 'Approved by QA' });
    };

    return (
      <div data-testid='approve-modal'>
        <button type='button' onClick={handleSubmit}>
          Submit Approve
        </button>
      </div>
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

    const handleSubmit = (): void => {
      onSubmit({ technicalReason: 'OTHER', technicalNotes: 'Rejected after review' });
    };

    return (
      <div data-testid='reject-modal'>
        <button type='button' onClick={handleSubmit}>
          Submit Reject
        </button>
      </div>
    );
  },
  RequestInfoQAModal: ({
    isOpen,
    onSubmit,
  }: {
    isOpen: boolean;
    onSubmit: (values: { requiredItems: ['OTHER']; otherText: string; notes: string }) => void;
  }) => {
    if (!isOpen) {
      return null;
    }

    const handleSubmit = (): void => {
      onSubmit({ requiredItems: ['OTHER'], otherText: 'Need closer photos', notes: 'Please resubmit.' });
    };

    return (
      <div data-testid='request-info-modal'>
        <button type='button' onClick={handleSubmit}>
          Submit Request Info
        </button>
      </div>
    );
  },
  QualityAgentNotesCard: ({ notes }: { notes: string }) => <div>CS Notes: {notes}</div>,
  QualityEvidencePhotos: () => <div>Evidence Photos</div>,
  QualityQuickInfoCard: () => <div>Quick Info</div>,
  QualityResubmissionCard: () => <div>Resubmission Card</div>,
=======
    onSubmit: (values: { approvedAmount: number }) => void;
  }) =>
    isOpen ? (
      <button type='button' onClick={() => onSubmit({ approvedAmount: 10 })}>
        Submit QA Approve
      </button>
    ) : null,
  RejectClaimQAModal: () => null,
  RequestInfoQAModal: () => null,
>>>>>>> test/all-test-cases
}));

vi.mock('#/hooks/quality', () => ({
  useQualityDetail: vi.fn(),
}));

const mockedUseQualityDetail = vi.mocked(useQualityDetail);

describe('QualityDetailPage', () => {
  beforeEach(() => {
<<<<<<< test/test-auth-quality-page
    mockNavigate.mockReset();
    mockHandleApprove.mockReset();
    mockHandleReject.mockReset();
    mockHandleRequestInfo.mockReset();

    mockParams.id = '55';
    mockLocation.search = '?status=forwarded';
=======
    routeId = '88';
    routeSearch = '?status=forwarded';
    mockNavigate.mockReset();
    mockHandleApprove.mockReset();
>>>>>>> test/all-test-cases

    mockedUseQualityDetail.mockReturnValue({
      qualityDetailQuery: {
        isLoading: false,
        isError: false,
<<<<<<< test/test-auth-quality-page
        error: null,
        data: {
          id: '55',
          claimNumber: 'CLM-55',
          customerName: 'Ali Raza',
          phone: '+92-300-1234567',
          issueType: 'PEELING',
          areaSqFt: 1200,
          topcoat: 'Weather Guard',
          description: 'Wall peeling issue in drawing room.',
          csNotes: 'Site visit done by CS team.',
          evidencePhotos: [],
          latestResubmission: undefined,
          linkedRegistration: {
            registrationId: 'REG-100',
            customerName: 'Ali Raza',
            purchaseDate: '2026-04-01',
            registrationRecordId: '100',
          },
          status: 'forwarded',
          workflowState: 'QA_REVIEW',
          forwardedBy: 'CS Agent',
          forwardedAt: '2026-04-16T10:00:00Z',
        },
      },
      handleApprove: mockHandleApprove,
      handleReject: mockHandleReject,
      handleRequestInfo: mockHandleRequestInfo,
=======
        data: {
          workflowState: 'QA_REVIEW',
          description: 'Cracking issue',
          csNotes: 'Need QA',
          customerName: 'Ali',
          phone: '0300',
          claimNumber: 'CLM-88',
          issueType: 'PAINT_PEELING',
          areaSqFt: 100,
          topcoat: 'Dulux X',
          evidencePhotos: [],
          latestResubmission: null,
          linkedRegistration: null,
          status: 'FORWARDED_TO_QA',
          forwardedBy: 'CS Agent',
          forwardedAt: '2026-04-10T00:00:00Z',
        },
      },
      handleApprove: mockHandleApprove,
      handleReject: vi.fn(),
      handleRequestInfo: vi.fn(),
>>>>>>> test/all-test-cases
      isActionPending: false,
    } as unknown as ReturnType<typeof useQualityDetail>);
  });

<<<<<<< test/test-auth-quality-page
  it('renders error state and navigates back to quality queue', () => {
=======
  it('renders error state and supports back navigation', () => {
>>>>>>> test/all-test-cases
    mockedUseQualityDetail.mockReturnValue({
      qualityDetailQuery: {
        isLoading: false,
        isError: true,
<<<<<<< test/test-auth-quality-page
        error: new Error('Detail failed'),
        data: undefined,
      },
      handleApprove: mockHandleApprove,
      handleReject: mockHandleReject,
      handleRequestInfo: mockHandleRequestInfo,
=======
        data: null,
        error: new Error('Detail failed'),
      },
      handleApprove: mockHandleApprove,
      handleReject: vi.fn(),
      handleRequestInfo: vi.fn(),
>>>>>>> test/all-test-cases
      isActionPending: false,
    } as unknown as ReturnType<typeof useQualityDetail>);

    render(<QualityDetailPage />);

    expect(screen.getByText('Unable to load quality claim detail')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to quality queue' }));

    expect(mockNavigate).toHaveBeenCalledWith('/quality?status=forwarded');
  });

<<<<<<< test/test-auth-quality-page
  it('opens and submits all quality action modals with claim id', () => {
    render(<QualityDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Approve' }));

    fireEvent.click(screen.getByRole('button', { name: 'Open Reject' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Reject' }));

    fireEvent.click(screen.getByRole('button', { name: 'Open Request Info' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Request Info' }));

    expect(mockHandleApprove).toHaveBeenCalledWith({ id: '55', technicalNotes: 'Approved by QA' });
    expect(mockHandleReject).toHaveBeenCalledWith({
      id: '55',
      technicalReason: 'OTHER',
      technicalNotes: 'Rejected after review',
    });
    expect(mockHandleRequestInfo).toHaveBeenCalledWith({
      id: '55',
      requiredItems: ['OTHER'],
      otherText: 'Need closer photos',
      notes: 'Please resubmit.',
    });
  });

  it('marks decision actions unavailable when workflow state is not QA_REVIEW', () => {
    mockedUseQualityDetail.mockReturnValue({
      qualityDetailQuery: {
        isLoading: false,
        isError: false,
        error: null,
        data: {
          id: '55',
          claimNumber: 'CLM-55',
          customerName: 'Ali Raza',
          phone: '+92-300-1234567',
          issueType: 'PEELING',
          areaSqFt: 1200,
          topcoat: 'Weather Guard',
          description: 'Wall peeling issue in drawing room.',
          csNotes: 'Wall peeling issue in drawing room.',
          evidencePhotos: [],
          latestResubmission: undefined,
          linkedRegistration: {
            registrationId: 'REG-100',
            customerName: 'Ali Raza',
            purchaseDate: '2026-04-01',
            registrationRecordId: '100',
          },
          status: 'infoRequested',
          workflowState: 'IN_REVIEW',
          forwardedBy: 'CS Agent',
          forwardedAt: '2026-04-16T10:00:00Z',
        },
      },
      handleApprove: mockHandleApprove,
      handleReject: mockHandleReject,
      handleRequestInfo: mockHandleRequestInfo,
      isActionPending: false,
    } as unknown as ReturnType<typeof useQualityDetail>);

    render(<QualityDetailPage />);

    expect(screen.getByText('Can Take Decision: No')).toBeInTheDocument();
    expect(screen.queryByText('Wall peeling issue in drawing room.')).not.toBeInTheDocument();
=======
  it('opens approve modal and submits quality decision', () => {
    render(<QualityDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open QA Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit QA Approve' }));

    expect(mockHandleApprove).toHaveBeenCalledWith({ id: '88', approvedAmount: 10 });
>>>>>>> test/all-test-cases
  });
});
