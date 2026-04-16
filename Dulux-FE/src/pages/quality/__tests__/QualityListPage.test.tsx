import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue, useQualityQueue } from '#/hooks';
import type { QualityQueueItem } from '#/types/quality.types';
import { QualityListPage } from '../QualityListPage';

let searchParamsState = new URLSearchParams('search=ali&page=2&status=all');
const mockSetSearchParams = vi.fn();
const mockSetStatusFilter = vi.fn();
const mockSetPage = vi.fn();

const QUALITY_ITEMS: QualityQueueItem[] = [
  {
    id: 'claim-1',
    claimNumber: 'CLM-100',
    customerName: 'Ali Raza',
    issueType: 'Bubbling',
    city: 'Karachi',
    status: 'forwarded',
    workflowState: 'QA_REVIEW',
    forwardedBy: 'CS Agent',
    forwardedAt: '2026-04-16T10:00:00Z',
    submittedAt: '2026-04-16T09:00:00Z',
  },
  {
    id: 'claim-2',
    claimNumber: 'CLM-101',
    customerName: 'Sara Khan',
    issueType: 'Peeling',
    city: 'Lahore',
    status: 'forwarded',
    workflowState: 'QA_REVIEW',
    forwardedBy: 'CS Agent',
    forwardedAt: '2026-04-16T10:05:00Z',
    submittedAt: '2026-04-16T09:10:00Z',
  },
];

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useSearchParams: () => [searchParamsState, mockSetSearchParams] as const,
  };
});

vi.mock('#/components/quality', () => ({
  QUALITY_STATUS_TABS: [
    { value: 'all', label: 'All' },
    { value: 'forwarded', label: 'QA Review' },
    { value: 'infoRequested', label: 'Resubmit' },
    { value: 'resolved', label: 'Resolved' },
  ],
  QualityQueueTable: ({ items }: { items: QualityQueueItem[] }) => <div>Rendered rows: {items.length}</div>,
}));

vi.mock('#/hooks', () => ({
  useQualityQueue: vi.fn(),
  useDebouncedValue: vi.fn(),
}));

const mockedUseQualityQueue = vi.mocked(useQualityQueue);
const mockedUseDebouncedValue = vi.mocked(useDebouncedValue);

describe('QualityListPage', () => {
  beforeEach(() => {
    searchParamsState = new URLSearchParams('search=ali&page=2&status=all');
    mockSetSearchParams.mockReset();
    mockSetStatusFilter.mockReset();
    mockSetPage.mockReset();

    mockedUseDebouncedValue.mockImplementation((value: string) => value);

    mockedUseQualityQueue.mockReturnValue({
      qualityQueueQuery: {
        data: {
          items: QUALITY_ITEMS,
          total: 30,
          page: 2,
          pageSize: 10,
          stats: {
            totalInQueue: 30,
            awaitingReview: 12,
            infoRequested: 7,
            resolvedToday: 4,
          },
        },
        isLoading: false,
        isError: false,
        error: null,
      },
      cardCountsQuery: {
        data: {
          totalInQueue: 30,
          awaitingReview: 12,
          infoRequested: 7,
          resolvedToday: 4,
        },
      },
      filters: { status: 'all', page: 2, pageSize: 10 },
      setStatusFilter: mockSetStatusFilter,
      setPage: mockSetPage,
    } as unknown as ReturnType<typeof useQualityQueue>);
  });

  it('renders summary cards and filtered table rows', () => {
    render(<QualityListPage />);

    expect(screen.getByText('Total In Queue')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Rendered rows: 1')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('changes status filter when a tab is clicked', () => {
    render(<QualityListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'QA Review' }));

    expect(mockSetStatusFilter).toHaveBeenCalledWith('forwarded');
  });

  it('updates search params when search input changes', () => {
    render(<QualityListPage />);

    fireEvent.change(screen.getByLabelText('Search quality queue'), {
      target: { value: 'karachi' },
    });

    const updateFn = mockSetSearchParams.mock.calls[0]?.[0] as (previous: URLSearchParams) => URLSearchParams;
    const nextParams = updateFn(new URLSearchParams('status=all&page=9'));

    expect(nextParams.get('search')).toBe('karachi');
    expect(nextParams.get('page')).toBe('1');
  });

  it('triggers previous and next page handlers from pagination controls', () => {
    render(<QualityListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(mockSetPage).toHaveBeenCalledWith(1);
    expect(mockSetPage).toHaveBeenCalledWith(3);
  });

  it('renders error and empty states from queue query status', () => {
    mockedUseQualityQueue.mockReturnValue({
      qualityQueueQuery: {
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Queue timeout'),
      },
      cardCountsQuery: {
        data: {
          totalInQueue: 0,
          awaitingReview: 0,
          infoRequested: 0,
          resolvedToday: 0,
        },
      },
      filters: { status: 'all', page: 1, pageSize: 10 },
      setStatusFilter: mockSetStatusFilter,
      setPage: mockSetPage,
    } as unknown as ReturnType<typeof useQualityQueue>);

    render(<QualityListPage />);

    expect(screen.getByText('Failed to load quality queue')).toBeInTheDocument();
    expect(screen.getByText('Queue timeout')).toBeInTheDocument();

    mockedUseQualityQueue.mockReturnValue({
      qualityQueueQuery: {
        data: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 10,
          stats: {
            totalInQueue: 0,
            awaitingReview: 0,
            infoRequested: 0,
            resolvedToday: 0,
          },
        },
        isLoading: false,
        isError: false,
        error: null,
      },
      cardCountsQuery: {
        data: {
          totalInQueue: 0,
          awaitingReview: 0,
          infoRequested: 0,
          resolvedToday: 0,
        },
      },
      filters: { status: 'all', page: 1, pageSize: 10 },
      setStatusFilter: mockSetStatusFilter,
      setPage: mockSetPage,
    } as unknown as ReturnType<typeof useQualityQueue>);

    render(<QualityListPage />);

    expect(screen.getByText('No claims in quality queue')).toBeInTheDocument();
  });
});
