<<<<<<< test/test-auth-quality-page
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useComplaintThread, useComplaints } from '#/hooks/complaints';
import type {
  ConversationListItem,
  ConversationListResponse,
  ConversationStats,
  ConversationThread,
  LiveChatCardCounts,
} from '#/types/complaints';
import { LiveChatPage } from '../LiveChatPage';

const mockNavigate = vi.fn();
const mockSetStatusFilter = vi.fn();
const mockSetSearch = vi.fn();
const mockSendMessage = vi.fn();
const mockResolveConversation = vi.fn();

const mockParams = {
  id: undefined as string | undefined,
};

const CONVERSATION_ITEMS: ConversationListItem[] = [
  {
    id: 'thread-1',
    claimNumber: 'CLM-1',
    customerName: 'Ali Raza',
    customerPhone: '+92-300-1111111',
    city: 'Karachi',
    issueType: 'Peeling',
    apiStatus: 'OPEN',
    status: 'active',
    channel: 'whatsapp',
    unreadCount: 2,
    lastMessagePreview: 'Need support',
    lastMessageAt: '2026-04-16T10:00:00Z',
  },
  {
    id: 'thread-2',
    claimNumber: 'CLM-2',
    customerName: 'Sara Khan',
    customerPhone: '+92-300-2222222',
    city: 'Lahore',
    issueType: 'Cracking',
    apiStatus: 'IN_PROGRESS',
    status: 'active',
    channel: 'manual',
    unreadCount: 0,
    lastMessagePreview: 'Issue under review',
    lastMessageAt: '2026-04-16T10:05:00Z',
  },
];

const CONVERSATION_STATS: ConversationStats = {
  open: 4,
  inProgress: 3,
  resolved: 2,
  closed: 1,
};

const CARD_COUNTS: LiveChatCardCounts = {
  open: 4,
  inProgress: 3,
  closed: 1,
};

const THREAD_DATA: ConversationThread = {
  ...CONVERSATION_ITEMS[0],
  ticketId: '55',
  submittedAt: '2026-04-16T09:00:00Z',
  registrationId: 'REG-100',
  description: 'Paint is peeling from wall.',
  closureNote: '',
  closedAt: null,
  whatsappConnected: true,
  customerHistory: {
    registrations: 1,
    claims: 1,
    pastComplaints: 0,
  },
  complaintImages: [],
  messages: [],
};
=======
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useComplaintThread, useComplaints } from '#/hooks/complaints';
import { LiveChatPage } from '../LiveChatPage';

const mockNavigate = vi.fn();

let selectedThreadId: string | undefined;
>>>>>>> test/all-test-cases

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
<<<<<<< test/test-auth-quality-page
    useParams: () => mockParams,
=======
    useParams: () => ({ id: selectedThreadId }),
>>>>>>> test/all-test-cases
  };
});

vi.mock('#/components/auditLogs', () => ({
<<<<<<< test/test-auth-quality-page
  AuditTimelinePanel: ({ objectId }: { objectId: string }) => <div>Audit for {objectId}</div>,
}));

vi.mock('#/components/complaints', () => ({
  ConversationStats: ({ stats }: { stats: ConversationStats }) => (
    <div>
      Stats: {stats.open}/{stats.inProgress}/{stats.resolved}/{stats.closed}
    </div>
  ),
  ConversationListPanel: ({
    items,
    selectedThreadId,
    openUnseenThreadIds,
    onStatusChange,
    onSearchChange,
    onThreadSelect,
  }: {
    items: ConversationListItem[];
    selectedThreadId?: string;
    openUnseenThreadIds: string[];
    onStatusChange: (status: 'all' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => void;
    onSearchChange: (search: string) => void;
    onThreadSelect: (threadId: string) => void;
  }) => {
    const handleSelectOther = (): void => {
      onThreadSelect('thread-2');
    };

    const handleStatusChange = (): void => {
      onStatusChange('OPEN');
    };

    const handleSearch = (): void => {
      onSearchChange('ali');
    };

    return (
      <section>
        <p>List Count: {items.length}</p>
        <p>Selected: {selectedThreadId ?? 'none'}</p>
        <p>Open Unseen: {openUnseenThreadIds.join(',')}</p>
        <button type='button' onClick={handleSelectOther}>
          Select Thread 2
        </button>
        <button type='button' onClick={handleStatusChange}>
          Change Status
        </button>
        <button type='button' onClick={handleSearch}>
          Change Search
        </button>
      </section>
    );
  },
  ChatThreadPanel: ({
    thread,
    isLoading,
    isError,
    onSendMessage,
  }: {
    thread?: ConversationThread;
    isLoading: boolean;
    isError: boolean;
    onSendMessage: (message: string) => void;
  }) => {
    const handleSend = (): void => {
      onSendMessage('hello customer');
    };

    return (
      <section>
        <p>Thread Loading: {String(isLoading)}</p>
        <p>Thread Error: {String(isError)}</p>
        <p>Thread Id: {thread?.id ?? 'none'}</p>
        <button type='button' onClick={handleSend}>
          Send Message
        </button>
      </section>
    );
  },
  ConversationInfoPanel: ({ thread, onResolve }: { thread?: ConversationThread; onResolve: () => void }) => {
    const handleResolve = (): void => {
      onResolve();
    };

    return (
      <section>
        <p>Info Thread: {thread?.id ?? 'none'}</p>
        <button type='button' onClick={handleResolve}>
          Open Resolve Modal
        </button>
      </section>
    );
  },
  ResolveConversationModal: ({
    isOpen,
    onClose,
    onConfirm,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (closureNote: string) => void;
  }) => {
    if (!isOpen) {
      return <div>Resolve Modal Closed</div>;
    }

    const handleConfirm = (): void => {
      onConfirm('resolved by qa');
    };

    return (
      <div>
        <p>Resolve Modal Open</p>
        <button type='button' onClick={handleConfirm}>
          Confirm Resolve
        </button>
        <button type='button' onClick={onClose}>
          Close Resolve
        </button>
      </div>
    );
  },
=======
  AuditTimelinePanel: () => <div>Audit Timeline</div>,
}));

vi.mock('#/components/complaints', () => ({
  ConversationStats: () => <div>Conversation Stats</div>,
  ConversationListPanel: () => <div>Conversation List</div>,
  ChatThreadPanel: () => <div>Chat Thread</div>,
  ConversationInfoPanel: () => <div>Conversation Info</div>,
  ResolveConversationModal: () => null,
>>>>>>> test/all-test-cases
}));

vi.mock('#/hooks/complaints', () => ({
  useComplaints: vi.fn(),
  useComplaintThread: vi.fn(),
}));

const mockedUseComplaints = vi.mocked(useComplaints);
const mockedUseComplaintThread = vi.mocked(useComplaintThread);

<<<<<<< test/test-auth-quality-page
const createConversationsResponse = (items: ConversationListItem[]): ConversationListResponse => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 10,
  stats: CONVERSATION_STATS,
});

describe('LiveChatPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSetStatusFilter.mockReset();
    mockSetSearch.mockReset();
    mockSendMessage.mockReset();
    mockResolveConversation.mockReset();

    mockParams.id = undefined;

    mockedUseComplaints.mockReturnValue({
      conversationsQuery: {
        data: createConversationsResponse(CONVERSATION_ITEMS),
        isLoading: false,
        isError: false,
        error: null,
      },
      cardCountsQuery: {
        data: CARD_COUNTS,
      },
      filters: {
        status: 'all',
        search: undefined,
        page: 1,
        pageSize: 10,
      },
      setStatusFilter: mockSetStatusFilter,
      setSearch: mockSetSearch,
      setPage: vi.fn(),
=======
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
>>>>>>> test/all-test-cases
    } as unknown as ReturnType<typeof useComplaints>);

    mockedUseComplaintThread.mockReturnValue({
      threadQuery: {
<<<<<<< test/test-auth-quality-page
        data: THREAD_DATA,
        isLoading: false,
        isError: false,
        error: null,
      },
      sendMessage: mockSendMessage,
      resolveConversation: mockResolveConversation,
=======
        isLoading: false,
        isError: false,
        data: null,
      },
      sendMessage: vi.fn(),
      resolveConversation: vi.fn(),
>>>>>>> test/all-test-cases
      isMessageSending: false,
      isActionPending: false,
    } as unknown as ReturnType<typeof useComplaintThread>);
  });

<<<<<<< test/test-auth-quality-page
  it('redirects to first thread when no thread id is selected', () => {
    render(<LiveChatPage />);

    expect(mockNavigate).toHaveBeenCalledWith('/complaints/thread-1', { replace: true });
    expect(screen.getByText('List Count: 2')).toBeInTheDocument();
  });

  it('does not auto-redirect when selected thread id exists and supports list interactions', () => {
    mockParams.id = 'thread-1';

    render(<LiveChatPage />);

    expect(mockNavigate).not.toHaveBeenCalledWith('/complaints/thread-1', { replace: true });

    fireEvent.click(screen.getByRole('button', { name: 'Select Thread 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change Status' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change Search' }));

    expect(mockNavigate).toHaveBeenCalledWith('/complaints/thread-2');
    expect(mockSetStatusFilter).toHaveBeenCalledWith('OPEN');
    expect(mockSetSearch).toHaveBeenCalledWith('ali');
  });

  it('opens resolve modal and confirms resolve for active thread', () => {
    mockParams.id = 'thread-1';

    render(<LiveChatPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Resolve Modal' }));

    expect(screen.getByText('Resolve Modal Open')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Resolve' }));

    expect(mockResolveConversation).toHaveBeenCalledWith('resolved by qa');
  });

  it('renders error state when conversation query fails', () => {
    mockedUseComplaints.mockReturnValue({
      conversationsQuery: {
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Queue offline'),
      },
      cardCountsQuery: {
        data: CARD_COUNTS,
      },
      filters: {
        status: 'all',
        search: undefined,
        page: 1,
        pageSize: 10,
      },
      setStatusFilter: mockSetStatusFilter,
      setSearch: mockSetSearch,
      setPage: vi.fn(),
=======
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
>>>>>>> test/all-test-cases
    } as unknown as ReturnType<typeof useComplaints>);

    render(<LiveChatPage />);

    expect(screen.getByText('Failed to load live chat')).toBeInTheDocument();
<<<<<<< test/test-auth-quality-page
    expect(screen.getByText('Queue offline')).toBeInTheDocument();
  });

  it('passes thread and send-message behavior to thread panel', () => {
    mockParams.id = 'thread-1';

    render(<LiveChatPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(screen.getByText('Thread Id: thread-1')).toBeInTheDocument();
    expect(mockSendMessage).toHaveBeenCalledWith('hello customer');
=======
    expect(screen.getByText('Queue down')).toBeInTheDocument();
>>>>>>> test/all-test-cases
  });
});
