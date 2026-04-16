import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClaims } from '#/hooks/claims';
import { ClaimsListPage } from '../ClaimsListPage';

const mockSetSearchParams = vi.fn();
const mockSetStatusFilter = vi.fn();
const mockSetIssueTypeFilter = vi.fn();
const mockSetSearch = vi.fn();
const mockSetPage = vi.fn();
const mockHandleCreateClaim = vi.fn();

let currentSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useSearchParams: () => [currentSearchParams, mockSetSearchParams],
  };
});

vi.mock('#/components/claims', () => ({
  CLAIM_STATUS_TABS: [
    { value: 'all', label: 'All Claims' },
    { value: 'pending', label: 'Pending' },
  ],
  ClaimsTable: ({ claims }: { claims: Array<{ id: string }> }) => <div>Claims Table {claims.length}</div>,
  AddClaimModal: ({
    isOpen,
    onClose,
    onSubmit,
  }: {
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (payload: unknown) => void;
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <div>
        <p>Add Claim Modal</p>
        <button type='button' onClick={() => onSubmit({ registrationCode: 'REG-101' })}>
          Submit Claim
        </button>
        <button type='button' onClick={onClose}>
          Close Claim Modal
        </button>
      </div>
    );
  },
}));

vi.mock('#/hooks/claims', () => ({
  useClaims: vi.fn(),
}));

const mockedUseClaims = vi.mocked(useClaims);

describe('ClaimsListPage', () => {
  beforeEach(() => {
    mockSetSearchParams.mockReset();
    mockSetStatusFilter.mockReset();
    mockSetIssueTypeFilter.mockReset();
    mockSetSearch.mockReset();
    mockSetPage.mockReset();
    mockHandleCreateClaim.mockReset();
    currentSearchParams = new URLSearchParams();

    mockedUseClaims.mockReturnValue({
      claimsQuery: {
        data: {
          items: [{ id: 'CLM-1' }],
          total: 20,
        },
        isLoading: false,
        isError: false,
        error: null,
      },
      cardCountsQuery: {
        data: {
          totalClaims: 10,
          pendingCsReview: 4,
          forwardedToQuality: 2,
          resolved: 4,
        },
      },
      filters: {
        status: 'all',
        issueType: 'all',
        search: '',
        page: 1,
        pageSize: 10,
      },
      setStatusFilter: mockSetStatusFilter,
      setIssueTypeFilter: mockSetIssueTypeFilter,
      setSearch: mockSetSearch,
      setPage: mockSetPage,
      handleCreateClaim: mockHandleCreateClaim,
      isCreateClaimPending: false,
    } as unknown as ReturnType<typeof useClaims>);
  });

  it('renders claims list stats, table, and pagination', () => {
    render(<ClaimsListPage />);

    expect(screen.getByText('Total Claims')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Claims Table 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('updates filters when status tab and search are changed', () => {
    render(<ClaimsListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Pending' }));
    fireEvent.change(screen.getByPlaceholderText('Search by registration or phone number'), {
      target: { value: '03001234567' },
    });

    expect(mockSetStatusFilter).toHaveBeenCalledWith('pending');
    expect(mockSetSearch).toHaveBeenCalledWith('03001234567');
  });

  it('renders error state when claims query fails', () => {
    mockedUseClaims.mockReturnValue({
      claimsQuery: {
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Claims API unavailable'),
      },
      cardCountsQuery: { data: undefined },
      filters: {
        status: 'all',
        issueType: 'all',
        search: '',
        page: 1,
        pageSize: 10,
      },
      setStatusFilter: mockSetStatusFilter,
      setIssueTypeFilter: mockSetIssueTypeFilter,
      setSearch: mockSetSearch,
      setPage: mockSetPage,
      handleCreateClaim: mockHandleCreateClaim,
      isCreateClaimPending: false,
    } as unknown as ReturnType<typeof useClaims>);

    render(<ClaimsListPage />);

    expect(screen.getByText('Failed to load claims')).toBeInTheDocument();
    expect(screen.getByText('Claims API unavailable')).toBeInTheDocument();
  });

  it('opens create-claim modal from query param and clears param on success', () => {
    currentSearchParams = new URLSearchParams('createClaim=1');

    mockHandleCreateClaim.mockImplementation((_: unknown, options?: { onSuccess?: () => void }) => {
      options?.onSuccess?.();
    });

    render(<ClaimsListPage />);

    expect(screen.getByText('Add Claim Modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Claim' }));

    expect(mockHandleCreateClaim).toHaveBeenCalledWith(
      { registrationCode: 'REG-101' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
    expect(mockSetSearchParams).toHaveBeenCalled();
  });
});
