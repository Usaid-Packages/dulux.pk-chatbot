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

let searchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useSearchParams: () => [searchParams, mockSetSearchParams],
  };
});

vi.mock('#/components/claims', async () => {
  const actual = await vi.importActual('#/components/claims');

  return {
    ...actual,
    ClaimsTable: ({ claims }: { claims: Array<{ id: string }> }) => <div>Claims Table {claims.length}</div>,
    AddClaimModal: ({
      isOpen,
      onSubmit,
    }: {
      isOpen: boolean;
      onSubmit: (payload: { issueType: 'PAINT_PEELING' }) => void;
    }) =>
      isOpen ? (
        <button type='button' onClick={() => onSubmit({ issueType: 'PAINT_PEELING' })}>
          Submit Claim Modal
        </button>
      ) : null,
  };
});

vi.mock('#/hooks/claims', () => ({
  useClaims: vi.fn(),
}));

const mockedUseClaims = vi.mocked(useClaims);

describe('ClaimsListPage', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    mockSetSearchParams.mockReset();
    mockSetStatusFilter.mockReset();
    mockSetIssueTypeFilter.mockReset();
    mockSetSearch.mockReset();
    mockSetPage.mockReset();
    mockHandleCreateClaim.mockReset();

    mockedUseClaims.mockReturnValue({
      claimsQuery: {
        data: {
          items: [{ id: 'CLM-1' }],
          total: 15,
        },
        isLoading: false,
        isError: false,
      },
      cardCountsQuery: {
        data: {
          totalClaims: 12,
          pendingCsReview: 4,
          forwardedToQuality: 3,
          resolved: 5,
        },
      },
      filters: {
        status: 'all',
        issueType: 'all',
        search: '',
        page: 1,
      },
      setStatusFilter: mockSetStatusFilter,
      setIssueTypeFilter: mockSetIssueTypeFilter,
      setSearch: mockSetSearch,
      setPage: mockSetPage,
      handleCreateClaim: mockHandleCreateClaim,
      isCreateClaimPending: false,
    } as unknown as ReturnType<typeof useClaims>);
  });

  it('renders stats and table content', () => {
    render(<ClaimsListPage />);

    expect(screen.getByText('Total Claims')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Claims Table 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('changes status filter and pagination', () => {
    render(<ClaimsListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Pending' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(mockSetStatusFilter).toHaveBeenCalledWith('submitted');
    expect(mockSetPage).toHaveBeenCalledWith(2);
  });

  it('opens create modal via query param and submits claim', () => {
    searchParams = new URLSearchParams('createClaim=1');

    render(<ClaimsListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Claim Modal' }));

    expect(mockHandleCreateClaim).toHaveBeenCalledTimes(1);
  });

  it('renders API error state', () => {
    mockedUseClaims.mockReturnValue({
      claimsQuery: {
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Unable to fetch claims'),
      },
      cardCountsQuery: {
        data: {
          totalClaims: 0,
          pendingCsReview: 0,
          forwardedToQuality: 0,
          resolved: 0,
        },
      },
      filters: {
        status: 'all',
        issueType: 'all',
        search: '',
        page: 1,
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
    expect(screen.getByText('Unable to fetch claims')).toBeInTheDocument();
  });
});
