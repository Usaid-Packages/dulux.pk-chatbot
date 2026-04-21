import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '#/constants';
import { useAuthContext } from '#/context';
import { useRegistrationDetail } from '#/hooks/registrations';
import { RegistrationDetailPage } from '../RegistrationDetailPage';

const mockNavigate = vi.fn();

const mockLocation = {
  search: '?tab=pending',
  state: null as unknown,
};

const mockParams = {
  id: '12',
};

const mockApproveRegistration = vi.fn();
const mockRejectRegistration = vi.fn();
const mockResubmitRegistration = vi.fn();
const mockSubmitResubmitChanges = vi.fn();

const REGISTRATION_FIXTURE = {
  id: 12,
  state: 'PENDING',
  paintPairInvoices: [
    {
      id: 'invoice-1',
      image: {
        image: '/media/invoice-1.png',
      },
    },
  ],
  paintPairs: [
    {
      id: 'pair-1',
      topcoat: { name: 'Topcoat A' },
      topcoatQuantity: 2,
      basecoat: { name: 'Basecoat B' },
      basecoatQuantity: 1,
    },
  ],
  purchaseDealer: 'Dealer Name',
  purchaseDealerCity: 'Karachi',
  purchaseDealerAddress: 'Street 1',
  province: 'Sindh',
  siteAddress: 'Site Address',
} as const;

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

vi.mock('#/components/registrations', () => ({
  RegistrationDetailPanel: ({
    showActionCenter,
    onOpenApproveModal,
    onOpenResubmitModal,
    onOpenRejectModal,
  }: {
    showActionCenter: boolean;
    onOpenApproveModal: () => void;
    onOpenResubmitModal: () => void;
    onOpenRejectModal: () => void;
  }) => (
    <div>
      <p>{showActionCenter ? 'Action Center Visible' : 'Action Center Hidden'}</p>
      <button type='button' onClick={onOpenApproveModal}>
        Open Approve
      </button>
      <button type='button' onClick={onOpenResubmitModal}>
        Open Resubmit
      </button>
      <button type='button' onClick={onOpenRejectModal}>
        Open Reject
      </button>
    </div>
  ),
  ApproveRegistrationModal: ({ isOpen, onSubmit }: { isOpen: boolean; onSubmit: (values: unknown) => void }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <div data-testid='approve-modal'>
        <button type='button' onClick={() => onSubmit({ notes: 'approved' })}>
          Submit Approve
        </button>
      </div>
    );
  },
  ResubmissionModal: ({ isOpen, onSubmit }: { isOpen: boolean; onSubmit: (values: unknown) => void }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <div data-testid='resubmission-modal'>
        <button type='button' onClick={() => onSubmit({ notes: 'resubmit request' })}>
          Submit Resubmission
        </button>
      </div>
    );
  },
  ResubmitUpdateModal: ({ isOpen, onSubmit }: { isOpen: boolean; onSubmit: (values: unknown) => void }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <div data-testid='resubmit-update-modal'>
        <button type='button' onClick={() => onSubmit({ fields: [] })}>
          Submit Resubmit Update
        </button>
      </div>
    );
  },
  RejectRegistrationModal: ({ isOpen, onSubmit }: { isOpen: boolean; onSubmit: (values: unknown) => void }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <div data-testid='reject-modal'>
        <button type='button' onClick={() => onSubmit({ reason: 'bad data' })}>
          Submit Reject
        </button>
      </div>
    );
  },
}));

vi.mock('#/context', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('#/hooks/registrations', () => ({
  useRegistrationDetail: vi.fn(),
}));

const mockedUseAuthContext = vi.mocked(useAuthContext);
const mockedUseRegistrationDetail = vi.mocked(useRegistrationDetail);

describe('RegistrationDetailPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();

    mockApproveRegistration.mockReset();
    mockRejectRegistration.mockReset();
    mockResubmitRegistration.mockReset();
    mockSubmitResubmitChanges.mockReset();

    mockLocation.search = '?tab=pending';
    mockLocation.state = null;
    mockParams.id = '12';

    mockedUseAuthContext.mockReturnValue({
      user: {
        role: 'cs',
      },
    } as unknown as ReturnType<typeof useAuthContext>);

    mockedUseRegistrationDetail.mockReturnValue({
      isLoading: false,
      isError: false,
      errorMessage: '',
      isApprovePending: false,
      isRejectPending: false,
      isResubmitPending: false,
      isResubmitUpdatePending: false,
      registration: REGISTRATION_FIXTURE,
      approveRegistration: mockApproveRegistration,
      rejectRegistration: mockRejectRegistration,
      resubmitRegistration: mockResubmitRegistration,
      submitResubmitChanges: mockSubmitResubmitChanges,
    } as unknown as ReturnType<typeof useRegistrationDetail>);
  });

  it('renders invalid-id state and navigates back to registrations', () => {
    mockParams.id = '';

    render(<RegistrationDetailPage />);

    expect(screen.getByText('Invalid registration id.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to registrations' }));

    expect(mockNavigate).toHaveBeenCalledWith(`${ROUTES.REGISTRATIONS}?tab=pending`);
  });

  it('honors backTo state route on error screen', () => {
    mockLocation.state = { backTo: '/quality/12' };

    mockedUseRegistrationDetail.mockReturnValue({
      isLoading: false,
      isError: true,
      errorMessage: 'Unable to load',
      isApprovePending: false,
      isRejectPending: false,
      isResubmitPending: false,
      isResubmitUpdatePending: false,
      registration: null,
      approveRegistration: mockApproveRegistration,
      rejectRegistration: mockRejectRegistration,
      resubmitRegistration: mockResubmitRegistration,
      submitResubmitChanges: mockSubmitResubmitChanges,
    } as unknown as ReturnType<typeof useRegistrationDetail>);

    render(<RegistrationDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Back to registrations' }));

    expect(mockNavigate).toHaveBeenCalledWith('/quality/12');
  });

  it('hides action center and modals for quality role', () => {
    mockedUseAuthContext.mockReturnValue({
      user: {
        role: 'quality',
      },
    } as unknown as ReturnType<typeof useAuthContext>);

    render(<RegistrationDetailPage />);

    expect(screen.getByText('Action Center Hidden')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Approve' }));

    expect(screen.queryByTestId('approve-modal')).not.toBeInTheDocument();
  });

  it('opens resubmit-update modal for RESUBMIT state', () => {
    mockedUseRegistrationDetail.mockReturnValue({
      isLoading: false,
      isError: false,
      errorMessage: '',
      isApprovePending: false,
      isRejectPending: false,
      isResubmitPending: false,
      isResubmitUpdatePending: false,
      registration: {
        ...REGISTRATION_FIXTURE,
        state: 'RESUBMIT',
      },
      approveRegistration: mockApproveRegistration,
      rejectRegistration: mockRejectRegistration,
      resubmitRegistration: mockResubmitRegistration,
      submitResubmitChanges: mockSubmitResubmitChanges,
    } as unknown as ReturnType<typeof useRegistrationDetail>);

    render(<RegistrationDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Resubmit' }));

    expect(screen.getByTestId('resubmit-update-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('resubmission-modal')).not.toBeInTheDocument();
  });

  it('submits approve action through detail hook', () => {
    render(<RegistrationDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Approve' }));

    expect(mockApproveRegistration).toHaveBeenCalledTimes(1);
    expect(mockApproveRegistration.mock.calls[0][0]).toEqual({ notes: 'approved' });
    expect(typeof mockApproveRegistration.mock.calls[0][1]).toBe('function');
  });
});
