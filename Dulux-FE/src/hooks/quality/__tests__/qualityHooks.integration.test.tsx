import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useQualityDetail, useQualityQueue } from '#/hooks/quality';

const mockSetSearchParams = vi.fn();
const mockUseQuery = vi.fn();
const mockApproveMutate = vi.fn();
const mockRejectMutate = vi.fn();
const mockRequestInfoMutate = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockSearchParams = new URLSearchParams('status=forwarded&page=3');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams] as const,
  };
});

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');

  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
  };
});

vi.mock('react-toastify', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('#/data-layer/quality', () => ({
  getQualityQueue: vi.fn(),
  getQualityCardCounts: vi.fn(),
  getQualityClaimById: vi.fn(),
  useApproveQualityClaimMutation: () => ({ mutate: mockApproveMutate, isPending: false }),
  useRejectQualityClaimMutation: () => ({ mutate: mockRejectMutate, isPending: false }),
  useRequestMoreInfoQAMutation: () => ({ mutate: mockRequestInfoMutate, isPending: false }),
}));

vi.mock('#/utils', () => ({
  getApiErrorMessage: () => 'Mapped quality error',
}));

describe('quality hooks integration', () => {
  beforeEach(() => {
    mockSetSearchParams.mockReset();
    mockUseQuery.mockReset();
    mockApproveMutate.mockReset();
    mockRejectMutate.mockReset();
    mockRequestInfoMutate.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();

    mockSearchParams.set('status', 'forwarded');
    mockSearchParams.set('page', '3');
  });

  it('useQualityQueue reads filters from URL and updates params via setters', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: { items: [], total: 0 }, isLoading: false, isError: false, error: null })
      .mockReturnValueOnce({
        data: { totalInQueue: 0, awaitingReview: 0, infoRequested: 0, resolvedToday: 0 },
        isLoading: false,
      });

    const { result } = renderHook(() => useQualityQueue());

    expect(result.current.filters).toEqual({ status: 'forwarded', page: 3, pageSize: 10 });

    act(() => {
      result.current.setStatusFilter('resolved');
    });

    const setStatusUpdater = mockSetSearchParams.mock.calls[0]?.[0] as (previous: URLSearchParams) => URLSearchParams;
    const statusUpdated = setStatusUpdater(new URLSearchParams('status=all&page=7'));

    expect(statusUpdated.get('status')).toBe('resolved');
    expect(statusUpdated.get('page')).toBe('1');

    act(() => {
      result.current.setPage(5);
    });

    const setPageUpdater = mockSetSearchParams.mock.calls[1]?.[0] as (previous: URLSearchParams) => URLSearchParams;
    const pageUpdated = setPageUpdater(new URLSearchParams('status=forwarded&page=1'));

    expect(pageUpdated.get('page')).toBe('5');
  });

  it('useQualityDetail blocks approve/reject when claim detail is missing', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });

    const { result } = renderHook(() => useQualityDetail('12'));

    act(() => {
      result.current.handleApprove({ id: '12', technicalNotes: 'approve notes 123' });
      result.current.handleReject({ id: '12', technicalReason: 'OTHER', technicalNotes: 'reject notes 123' });
    });

    expect(mockToastError).toHaveBeenCalledWith('Claim detail is not available.');
    expect(mockApproveMutate).not.toHaveBeenCalled();
    expect(mockRejectMutate).not.toHaveBeenCalled();
  });

  it('useQualityDetail sends request-info mutation and reports success', () => {
    mockUseQuery.mockReturnValue({
      data: { id: '12', workflowState: 'QA_REVIEW' },
      isLoading: false,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useQualityDetail('12'));

    act(() => {
      result.current.handleRequestInfo({ id: '12', requiredItems: ['OTHER'], otherText: 'Need details' });
    });

    const mutationOptions = mockRequestInfoMutate.mock.calls[0]?.[1] as { onSuccess: () => void };

    act(() => {
      mutationOptions.onSuccess();
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Information request sent.');
  });
});
