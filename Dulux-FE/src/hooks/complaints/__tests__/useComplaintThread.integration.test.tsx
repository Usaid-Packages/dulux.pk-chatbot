import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useComplaintThread } from '#/hooks/complaints';

const mockUseQuery = vi.fn();
const mockMarkMutate = vi.fn();
const mockResolveMutate = vi.fn();
const mockCloseMutate = vi.fn();
const mockSendSocketMessage = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastInfo = vi.fn();

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
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}));

vi.mock('#/context', () => ({
  useAuthContext: () => ({ user: { id: 8 } }),
}));

vi.mock('#/data-layer/complaints', () => ({
  getConversationById: vi.fn(),
  useMarkConversationInProgressMutation: () => ({ mutate: mockMarkMutate, isPending: false }),
  useResolveConversationMutation: () => ({ mutate: mockResolveMutate, isPending: false }),
  useCloseConversationMutation: () => ({ mutate: mockCloseMutate, isPending: false }),
}));

vi.mock('#/hooks/complaints/useComplaintSocket', () => ({
  useComplaintSocket: () => ({
    sendSocketMessage: mockSendSocketMessage,
  }),
}));

vi.mock('#/utils', () => ({
  getApiErrorMessage: () => 'Mapped complaint error',
}));

describe('useComplaintThread integration', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockMarkMutate.mockReset();
    mockResolveMutate.mockReset();
    mockCloseMutate.mockReset();
    mockSendSocketMessage.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockToastInfo.mockReset();
  });

  it('sendMessage trims text and surfaces socket disconnect state', () => {
    mockUseQuery.mockReturnValue({
      data: { id: 'c-1', apiStatus: 'IN_PROGRESS' },
      isSuccess: true,
      isLoading: false,
      isError: false,
      error: null,
    });

    mockSendSocketMessage.mockReturnValueOnce(true).mockReturnValueOnce(false);

    const { result } = renderHook(() => useComplaintThread('c-1'));

    act(() => {
      result.current.sendMessage('   ');
      result.current.sendMessage(' hello ');
      result.current.sendMessage('second');
    });

    expect(mockSendSocketMessage).toHaveBeenCalledTimes(2);
    expect(mockSendSocketMessage).toHaveBeenCalledWith('hello');
    expect(mockToastError).toHaveBeenCalledWith('Chat socket is disconnected. Please wait and try again.');
  });

  it('resolveConversation shows info toast for already closed complaints', () => {
    mockUseQuery.mockReturnValue({
      data: { id: 'c-1', apiStatus: 'CLOSED' },
      isSuccess: true,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useComplaintThread('c-1'));

    act(() => {
      result.current.resolveConversation('done');
    });

    expect(mockToastInfo).toHaveBeenCalledWith('Complaint is already closed.');
    expect(mockResolveMutate).not.toHaveBeenCalled();
    expect(mockCloseMutate).not.toHaveBeenCalled();
  });

  it('resolveConversation on RESOLVED directly closes with trimmed closure note', () => {
    mockUseQuery.mockReturnValue({
      data: { id: 'c-1', apiStatus: 'RESOLVED' },
      isSuccess: true,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useComplaintThread('c-1'));

    act(() => {
      result.current.resolveConversation('  resolved note  ');
    });

    expect(mockCloseMutate).toHaveBeenCalledWith({ threadId: 'c-1', closureNote: 'resolved note' }, expect.any(Object));
  });

  it('resolveConversation on OPEN chains mark -> resolve -> close', () => {
    mockUseQuery.mockReturnValue({
      data: { id: 'c-1', apiStatus: 'OPEN' },
      isSuccess: true,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useComplaintThread('c-1'));

    act(() => {
      result.current.resolveConversation('final note');
    });

    const markCallWithOnSuccess = mockMarkMutate.mock.calls.find(([, options]) => {
      if (!options || typeof options !== 'object') {
        return false;
      }

      return typeof (options as { onSuccess?: unknown }).onSuccess === 'function';
    });
    const markOptions = markCallWithOnSuccess?.[1] as { onSuccess: () => void };

    act(() => {
      markOptions.onSuccess();
    });

    const resolveOptions = mockResolveMutate.mock.calls[0]?.[1] as { onSuccess: () => void };

    act(() => {
      resolveOptions.onSuccess();
    });

    expect(mockResolveMutate).toHaveBeenCalledWith({ threadId: 'c-1' }, expect.any(Object));
    expect(mockCloseMutate).toHaveBeenCalledWith({ threadId: 'c-1', closureNote: 'final note' }, expect.any(Object));
  });
});
