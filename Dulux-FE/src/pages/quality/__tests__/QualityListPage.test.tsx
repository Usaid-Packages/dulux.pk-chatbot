import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue, useQualityQueue } from '#/hooks';
import { QualityListPage } from '../QualityListPage';

const mockSetSearchParams = vi.fn();
const mockSetStatusFilter = vi.fn();
const mockSetPage = vi.fn();

let searchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useSearchParams: () => [searchParams, mockSetSearchParams],
  };
});

vi.mock('#/components/quality', async () => {
  const actual = await vi.importActual('#/components/quality');

  return {
    ...actual,
    QualityQueueTable: ({ items }: { items: Array<{ id: string }> }) => <div>Quality Table {items.length}</div>,
  };
});

vi.mock('#/hooks', () => ({
  useDebouncedValue: vi.fn(),
  useQualityQueue: vi.fn(),
}));

const mockedUseDebouncedValue = vi.mocked(useDebouncedValue);
const mockedUseQualityQueue = vi.mocked(useQualityQueue);

describe('QualityListPage', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    mockSetSearchParams.mockReset();
    mockSetStatusFilter.mockReset();
    mockSetPage.mockReset();

    mockedUseDebouncedValue.mockImplementation(value => value);
    mockedUseQualityQueue.mockReturnValue({
      qualityQueueQuery: {
        data: {
          items: [
            {
              id: 'Q-1',
              claimNumber: 'CLM-1',
              customerName: 'John',
              city: 'Karachi',
            },
          ],
          total: 12,
        },
        isLoading: false,
        isError: false,
      },
      cardCountsQuery: {
        data: {
          totalInQueue: 9,
          awaitingReview: 3,
          infoRequested: 2,
          resolvedToday: 4,
        },
      },
      filters: {
        status: 'all',
        page: 1,
      },
      setStatusFilter: mockSetStatusFilter,
      setPage: mockSetPage,
    } as unknown as ReturnType<typeof useQualityQueue>);
  });

  it('renders stats and table', () => {
    render(<QualityListPage />);

    expect(screen.getByText('Total In Queue')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('Quality Table 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('changes status filter and next page', () => {
    render(<QualityListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'QA Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(mockSetStatusFilter).toHaveBeenCalledWith('forwarded');
    expect(mockSetPage).toHaveBeenCalledWith(2);
  });

  it('renders error state', () => {
    mockedUseQualityQueue.mockReturnValue({
      qualityQueueQuery: {
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Queue API failed'),
      },
      cardCountsQuery: {
        data: {
          totalInQueue: 0,
          awaitingReview: 0,
          infoRequested: 0,
          resolvedToday: 0,
        },
      },
      filters: {
        status: 'all',
        page: 1,
      },
      setStatusFilter: mockSetStatusFilter,
      setPage: mockSetPage,
    } as unknown as ReturnType<typeof useQualityQueue>);

    render(<QualityListPage />);

    expect(screen.getByText('Failed to load quality queue')).toBeInTheDocument();
    expect(screen.getByText('Queue API failed')).toBeInTheDocument();
  });
});
