import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useComplaintThread, useComplaints } from '#/hooks/complaints';
import { LiveChatPage } from '../LiveChatPage';

const mockNavigate = vi.fn();

let selectedThreadId: string | undefined;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: selectedThreadId }),
  };
});

vi.mock('#/components/auditLogs', () => ({
  AuditTimelinePanel: () => <div>Audit Timeline</div>,
}));

vi.mock('#/components/complaints', () => ({
  ConversationStats: () => <div>Conversation Stats</div>,
  ConversationListPanel: () => <div>Conversation List</div>,
  ChatThreadPanel: () => <div>Chat Thread</div>,
  ConversationInfoPanel: () => <div>Conversation Info</div>,
  ResolveConversationModal: () => null,
}));

vi.mock('#/hooks/complaints', () => ({
  useComplaints: vi.fn(),
  useComplaintThread: vi.fn(),
}));

const mockedUseComplaints = vi.mocked(useComplaints);
const mockedUseComplaintThread = vi.mocked(useComplaintThread);

describe('LiveChatPage', () => {
  beforeEach(() => {
    selectedThreadId = undefined;
    mockNavigate.mockReset();

    mockedUseComplaints.mockReturnValue({
      conversationsQuery: {
        isLoading: false,
        isError: false,
        data: {
          items: [{ id: 'thread-1', apiStatus: 'OPEN' }],
          stats: {
            resolved: 1,
          },
        },
      },
      cardCountsQuery: {
        data: {
          open: 2,
          inProgress: 1,
          closed: 0,
        },
      },
      filters: {
        status: 'all',
        search: '',
      },
      setStatusFilter: vi.fn(),
      setSearch: vi.fn(),
    } as unknown as ReturnType<typeof useComplaints>);

    mockedUseComplaintThread.mockReturnValue({
      threadQuery: {
        isLoading: false,
        isError: false,
        data: null,
      },
      sendMessage: vi.fn(),
      resolveConversation: vi.fn(),
      isMessageSending: false,
      isActionPending: false,
    } as unknown as ReturnType<typeof useComplaintThread>);
  });

  it('navigates to first thread when no thread is selected', () => {
    render(<LiveChatPage />);

    expect(mockNavigate).toHaveBeenCalledWith('/complaints/thread-1', { replace: true });
  });

  it('renders queue error state', () => {
    mockedUseComplaints.mockReturnValue({
      conversationsQuery: {
        isLoading: false,
        isError: true,
        error: new Error('Queue down'),
        data: null,
      },
      cardCountsQuery: {
        data: {
          open: 0,
          inProgress: 0,
          closed: 0,
        },
      },
      filters: {
        status: 'all',
        search: '',
      },
      setStatusFilter: vi.fn(),
      setSearch: vi.fn(),
    } as unknown as ReturnType<typeof useComplaints>);

    render(<LiveChatPage />);

    expect(screen.getByText('Failed to load live chat')).toBeInTheDocument();
    expect(screen.getByText('Queue down')).toBeInTheDocument();
  });
});
