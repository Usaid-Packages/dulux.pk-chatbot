import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useQualityDetail } from '#/hooks/quality';
import { QualityDetailPage } from '../QualityDetailPage';

const mockNavigate = vi.fn();
const mockHandleApprove = vi.fn();

let routeId = '88';
let routeSearch = '?status=forwarded';

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
  ClaimWorkflowCard: () => <div>Workflow Card</div>,
  LinkedRegistrationCard: () => <div>Linked Registration</div>,
}));

vi.mock('#/components/quality', () => ({
  QualityAgentNotesCard: () => <div>Agent Notes</div>,
  QualityDecisionPanel: ({ onOpenApproveModal }: { onOpenApproveModal: () => void }) => (
    <button type='button' onClick={onOpenApproveModal}>
      Open QA Approve
    </button>
  ),
  QualityEvidencePhotos: () => <div>Evidence Photos</div>,
  QualityQuickInfoCard: () => <div>Quick Info</div>,
  QualityResubmissionCard: () => <div>Resubmission</div>,
  ApproveClaimModal: ({
    isOpen,
    onSubmit,
  }: {
    isOpen: boolean;
    onSubmit: (values: { approvedAmount: number }) => void;
  }) =>
    isOpen ? (
      <button type='button' onClick={() => onSubmit({ approvedAmount: 10 })}>
        Submit QA Approve
      </button>
    ) : null,
  RejectClaimQAModal: () => null,
  RequestInfoQAModal: () => null,
}));

vi.mock('#/hooks/quality', () => ({
  useQualityDetail: vi.fn(),
}));

const mockedUseQualityDetail = vi.mocked(useQualityDetail);

describe('QualityDetailPage', () => {
  beforeEach(() => {
    routeId = '88';
    routeSearch = '?status=forwarded';
    mockNavigate.mockReset();
    mockHandleApprove.mockReset();

    mockedUseQualityDetail.mockReturnValue({
      qualityDetailQuery: {
        isLoading: false,
        isError: false,
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
      isActionPending: false,
    } as unknown as ReturnType<typeof useQualityDetail>);
  });

  it('renders error state and supports back navigation', () => {
    mockedUseQualityDetail.mockReturnValue({
      qualityDetailQuery: {
        isLoading: false,
        isError: true,
        data: null,
        error: new Error('Detail failed'),
      },
      handleApprove: mockHandleApprove,
      handleReject: vi.fn(),
      handleRequestInfo: vi.fn(),
      isActionPending: false,
    } as unknown as ReturnType<typeof useQualityDetail>);

    render(<QualityDetailPage />);

    expect(screen.getByText('Unable to load quality claim detail')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to quality queue' }));

    expect(mockNavigate).toHaveBeenCalledWith('/quality?status=forwarded');
  });

  it('opens approve modal and submits quality decision', () => {
    render(<QualityDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open QA Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit QA Approve' }));

    expect(mockHandleApprove).toHaveBeenCalledWith({ id: '88', approvedAmount: 10 });
  });
});
