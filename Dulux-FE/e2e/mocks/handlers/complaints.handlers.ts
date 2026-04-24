import type { MockRouteDefinition } from '../routes';

type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface ComplaintMessageRecord {
  id: string;
  sender: 'CUSTOMER' | 'CS_AGENT' | 'SYSTEM';
  text: string;
  created: string;
}

interface ComplaintThreadRecord {
  id: string;
  registrationNumber: string;
  customerName: string;
  phoneNumber: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  assignedTo: number | null;
  assignedToEmail: string | null;
  closureNote: string;
  closedAt: string | null;
  created: string;
  modified: string;
  images: Array<{
    id: number;
    image: {
      id: number;
      image: string;
      created: string;
    };
    created: string;
  }>;
  messages: ComplaintMessageRecord[];
}

const createComplaintSeed = (): ComplaintThreadRecord[] => [
  {
    id: 'cmp-1',
    registrationNumber: 'REG-101',
    customerName: 'Ayesha',
    phoneNumber: '03001112222',
    subject: 'peeling',
    description: 'Paint is peeling near balcony wall.',
    status: 'OPEN',
    assignedTo: null,
    assignedToEmail: null,
    closureNote: '',
    closedAt: null,
    created: '2026-04-23T08:00:00Z',
    modified: '2026-04-23T08:00:00Z',
    images: [
      {
        id: 1001,
        image: {
          id: 501,
          image: 'https://picsum.photos/seed/complaint-cmp-1/1200/800',
          created: '2026-04-23T08:00:00Z',
        },
        created: '2026-04-23T08:00:00Z',
      },
    ],
    messages: [
      {
        id: 'cmp-1-msg-1',
        sender: 'CUSTOMER',
        text: 'Please check this complaint.',
        created: '2026-04-23T08:05:00Z',
      },
    ],
  },
  {
    id: 'cmp-2',
    registrationNumber: 'REG-102',
    customerName: 'Bilal',
    phoneNumber: '03002223333',
    subject: 'fading',
    description: 'Color is fading quickly in sunlight.',
    status: 'IN_PROGRESS',
    assignedTo: 2,
    assignedToEmail: 'cs.agent@dulux.local',
    closureNote: '',
    closedAt: null,
    created: '2026-04-23T08:30:00Z',
    modified: '2026-04-23T08:30:00Z',
    images: [],
    messages: [
      {
        id: 'cmp-2-msg-1',
        sender: 'CUSTOMER',
        text: 'Issue still not fixed.',
        created: '2026-04-23T08:35:00Z',
      },
      {
        id: 'cmp-2-msg-2',
        sender: 'CS_AGENT',
        text: 'We are checking this with quality.',
        created: '2026-04-23T08:40:00Z',
      },
    ],
  },
];

let complaintStore: ComplaintThreadRecord[] = createComplaintSeed();

export const resetComplaintsMockStore = (): void => {
  complaintStore = createComplaintSeed();
};

const parseComplaintId = (url: string): string | null => {
  const match = url.match(/\/api\/v1\/complaints\/([^/?]+)\/?(?:\?.*)?$/);
  return match?.[1] ?? null;
};

const parseMessagesComplaintId = (url: string): string | null => {
  const match = url.match(/\/api\/v1\/complaints\/([^/?]+)\/messages\/?(?:\?.*)?$/);
  return match?.[1] ?? null;
};

const toListItem = (thread: ComplaintThreadRecord) => ({
  id: thread.id,
  registration_number: thread.registrationNumber,
  phone_number: thread.phoneNumber,
  customer_name: thread.customerName,
  subject: thread.subject,
  status: thread.status,
  assigned_to: thread.assignedTo,
  assigned_to_email: thread.assignedToEmail,
  created: thread.created,
  modified: thread.modified,
});

const toDetailResponse = (thread: ComplaintThreadRecord) => ({
  id: thread.id,
  registration_number: thread.registrationNumber,
  phone_number: thread.phoneNumber,
  customer_name: thread.customerName,
  subject: thread.subject,
  description: thread.description,
  status: thread.status,
  assigned_to: thread.assignedTo,
  assigned_to_email: thread.assignedToEmail,
  closed_at: thread.closedAt,
  closure_note: thread.closureNote,
  images: thread.images,
  created: thread.created,
  modified: thread.modified,
});

const toMessageResponse = (message: ComplaintMessageRecord) => ({
  id: message.id,
  sender: message.sender,
  text: message.text,
  created: message.created,
});

const toCardCounts = (): { open: number; inProgress: number; closed: number } => ({
  open: complaintStore.filter(item => item.status === 'OPEN').length,
  inProgress: complaintStore.filter(item => item.status === 'IN_PROGRESS').length,
  closed: complaintStore.filter(item => item.status === 'CLOSED').length,
});

const parseRequestBody = (request: { postDataJSON: () => unknown }): Record<string, unknown> => {
  try {
    const payload = request.postDataJSON();
    if (payload && typeof payload === 'object') {
      return payload as Record<string, unknown>;
    }

    return {};
  } catch {
    return {};
  }
};

const applyComplaintAction = (thread: ComplaintThreadRecord, payload: Record<string, unknown>): void => {
  const action = typeof payload.action === 'string' ? payload.action : '';

  if (action === 'ASSIGN') {
    const assignedTo = payload.assigned_to;
    thread.assignedTo = typeof assignedTo === 'number' && Number.isFinite(assignedTo) ? assignedTo : thread.assignedTo;
    thread.assignedToEmail = 'cs.agent@dulux.local';
    thread.status = 'IN_PROGRESS';
  }

  if (action === 'RESOLVE') {
    thread.status = 'RESOLVED';
  }

  if (action === 'CLOSE') {
    thread.status = 'CLOSED';
    const closureNote = payload.closure_note;
    thread.closureNote = typeof closureNote === 'string' ? closureNote : thread.closureNote;
    thread.closedAt = new Date().toISOString();
  }

  thread.modified = new Date().toISOString();
};

export const complaintsHandlers: MockRouteDefinition[] = [
  {
    id: 'complaints-list',
    method: 'GET',
    url: /.*\/api\/v1\/complaints\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      if (request.url().includes('/card-counts/')) {
        return {
          status: 404,
          body: { detail: 'Unsupported complaints route.' },
        };
      }

      const requestUrl = new URL(request.url());
      const statusFilter = requestUrl.searchParams.get('status')?.trim().toUpperCase() ?? '';
      const searchFilter = requestUrl.searchParams.get('search')?.trim().toLowerCase() ?? '';

      const filtered = complaintStore.filter(item => {
        if (statusFilter.length === 0) {
          return true;
        }

        return item.status === statusFilter;
      });

      const searched = filtered.filter(item => {
        if (searchFilter.length === 0) {
          return true;
        }

        return (
          item.customerName.toLowerCase().includes(searchFilter) ||
          item.phoneNumber.toLowerCase().includes(searchFilter) ||
          item.subject.toLowerCase().includes(searchFilter)
        );
      });

      return {
        status: 200,
        body: {
          count: searched.length,
          next: null,
          previous: null,
          results: searched.map(toListItem),
        },
      };
    },
  },
  {
    id: 'complaint-detail',
    method: 'GET',
    url: /.*\/api\/v1\/complaints\/[^/?]+\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      if (request.url().includes('/messages/')) {
        return {
          status: 404,
          body: { detail: 'Unsupported complaint detail route.' },
        };
      }

      const complaintId = parseComplaintId(request.url());
      const complaint = complaintStore.find(item => item.id === complaintId);

      if (!complaint) {
        return {
          status: 404,
          body: { detail: 'Complaint not found.' },
        };
      }

      return {
        status: 200,
        body: toDetailResponse(complaint),
      };
    },
  },
  {
    id: 'complaint-update',
    method: 'PATCH',
    url: /.*\/api\/v1\/complaints\/[^/?]+\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const complaintId = parseComplaintId(request.url());
      const complaint = complaintStore.find(item => item.id === complaintId);

      if (!complaint) {
        return {
          status: 404,
          body: { detail: 'Complaint not found.' },
        };
      }

      const payload = parseRequestBody(request);
      applyComplaintAction(complaint, payload);

      return {
        status: 200,
        body: toDetailResponse(complaint),
      };
    },
  },
  {
    id: 'complaint-messages-list',
    method: 'GET',
    url: /.*\/api\/v1\/complaints\/[^/?]+\/messages\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const complaintId = parseMessagesComplaintId(request.url());
      const complaint = complaintStore.find(item => item.id === complaintId);

      if (!complaint) {
        return {
          status: 404,
          body: { detail: 'Complaint not found.' },
        };
      }

      return {
        status: 200,
        body: complaint.messages.map(toMessageResponse),
      };
    },
  },
  {
    id: 'complaint-messages-create',
    method: 'POST',
    url: /.*\/api\/v1\/complaints\/[^/?]+\/messages\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const complaintId = parseMessagesComplaintId(request.url());
      const complaint = complaintStore.find(item => item.id === complaintId);

      if (!complaint) {
        return {
          status: 404,
          body: { detail: 'Complaint not found.' },
        };
      }

      const payload = parseRequestBody(request);
      const text = typeof payload.text === 'string' ? payload.text.trim() : '';
      const messageId = `${complaint.id}-msg-${complaint.messages.length + 1}`;
      const createdAt = new Date().toISOString();

      const message: ComplaintMessageRecord = {
        id: messageId,
        sender: 'CS_AGENT',
        text: text.length > 0 ? text : 'Message',
        created: createdAt,
      };

      complaint.messages.push(message);
      complaint.modified = createdAt;

      if (complaint.status === 'OPEN') {
        complaint.status = 'IN_PROGRESS';
      }

      return {
        status: 201,
        body: toMessageResponse(message),
      };
    },
  },
  {
    id: 'complaints-card-counts',
    method: 'GET',
    url: /.*\/api\/v1\/complaints\/card-counts\/live-chat\/?(?:\?.*)?$/,
    handle: () => ({
      status: 200,
      body: toCardCounts(),
    }),
  },
];
