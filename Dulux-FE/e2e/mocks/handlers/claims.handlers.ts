import type { MockRouteDefinition } from '../routes';

type ClaimState =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'QA_REVIEW'
  | 'RESUBMIT'
  | 'QA_APPROVED'
  | 'QA_REJECTED'
  | 'APPROVED'
  | 'REJECTED';

interface ClaimRecord {
  id: number;
  claimNumber: string;
  registrationNumber: string;
  customerName: string;
  issueType: 'PEELING' | 'FADING' | 'CRACKING' | 'OTHERS';
  state: ClaimState;
  notes: string;
  city: string;
  created: string;
  modified: string;
  forwardedBy?: string;
  forwardedAt?: string;
}

const createClaimSeed = (): ClaimRecord[] => [
  {
    id: 201,
    claimNumber: 'CLM-201',
    registrationNumber: 'REG-101',
    customerName: 'Ali Khan',
    issueType: 'PEELING',
    state: 'SUBMITTED',
    notes: 'Paint started peeling on exterior wall.',
    city: 'Karachi',
    created: '2026-04-21T10:00:00Z',
    modified: '2026-04-21T10:00:00Z',
  },
  {
    id: 202,
    claimNumber: 'CLM-202',
    registrationNumber: 'REG-102',
    customerName: 'Sara Ali',
    issueType: 'FADING',
    state: 'IN_REVIEW',
    notes: 'Color faded after one season.',
    city: 'Lahore',
    created: '2026-04-21T11:00:00Z',
    modified: '2026-04-21T12:00:00Z',
  },
  {
    id: 203,
    claimNumber: 'CLM-203',
    registrationNumber: 'REG-103',
    customerName: 'Imran Shah',
    issueType: 'CRACKING',
    state: 'RESUBMIT',
    notes: 'Cracking observed around windows.',
    city: 'Islamabad',
    created: '2026-04-21T12:30:00Z',
    modified: '2026-04-21T13:00:00Z',
    forwardedBy: 'CS Team',
    forwardedAt: '2026-04-21T13:00:00Z',
  },
  {
    id: 204,
    claimNumber: 'CLM-204',
    registrationNumber: 'REG-104',
    customerName: 'Nadia Riaz',
    issueType: 'PEELING',
    state: 'QA_REVIEW',
    notes: 'Peeling observed on balcony wall.',
    city: 'Karachi',
    created: '2026-04-22T09:00:00Z',
    modified: '2026-04-22T10:00:00Z',
    forwardedBy: 'CS Team',
    forwardedAt: '2026-04-22T10:00:00Z',
  },
  {
    id: 205,
    claimNumber: 'CLM-205',
    registrationNumber: 'REG-105',
    customerName: 'Kamran Malik',
    issueType: 'FADING',
    state: 'QA_REVIEW',
    notes: 'Color tone variation after drying.',
    city: 'Lahore',
    created: '2026-04-22T11:00:00Z',
    modified: '2026-04-22T11:15:00Z',
    forwardedBy: 'CS Team',
    forwardedAt: '2026-04-22T11:15:00Z',
  },
  {
    id: 206,
    claimNumber: 'CLM-206',
    registrationNumber: 'REG-106',
    customerName: 'Bilal Ahmed',
    issueType: 'CRACKING',
    state: 'QA_REVIEW',
    notes: 'Hairline cracks around facade joints.',
    city: 'Islamabad',
    created: '2026-04-22T12:00:00Z',
    modified: '2026-04-22T12:20:00Z',
    forwardedBy: 'CS Team',
    forwardedAt: '2026-04-22T12:20:00Z',
  },
];

let claimStore: ClaimRecord[] = createClaimSeed();

export const resetClaimsMockStore = (): void => {
  claimStore = createClaimSeed();
};

const toClaimListItem = (claim: ClaimRecord) => ({
  id: claim.id,
  claim_number: claim.claimNumber,
  registration_number: claim.registrationNumber,
  customer_name: claim.customerName,
  issue_type: claim.issueType,
  state: claim.state,
  city: claim.city,
  claim_date: claim.created,
  created: claim.created,
  modified: claim.modified,
  forwarded_by: claim.forwardedBy,
  forwarded_at: claim.forwardedAt,
});

const toClaimDetail = (claim: ClaimRecord) => ({
  id: claim.id,
  claim_number: claim.claimNumber,
  issue_type: claim.issueType,
  state: claim.state,
  notes: claim.notes,
  claim_date: claim.created,
  created: claim.created,
  modified: claim.modified,
  approved_by: claim.forwardedBy ?? 'CS Team',
  approved_at: claim.forwardedAt ?? claim.modified,
  affected_area_sqft: '120',
  city: claim.city,
  registration: {
    id: claim.id + 1000,
    registration_code: claim.registrationNumber,
    customer_name: claim.customerName,
    phone_number: '03001234567',
    purchase_date: '2026-01-03',
    purchase_dealer: 'Paint Hub',
    state: 'SUBMITTED',
    city: claim.city,
  },
  paint_pair: {
    topcoat_name: 'Dulux Protect Plus',
  },
  images: [
    {
      id: claim.id * 10 + 1,
      photo_type: 'LONG_SHOT',
      image: {
        id: claim.id * 100 + 1,
        image: `https://picsum.photos/seed/${claim.id}-1/1200/800`,
        url: `https://picsum.photos/seed/${claim.id}-1/1200/800`,
      },
    },
    {
      id: claim.id * 10 + 2,
      photo_type: 'CLOSE_SHOT',
      image: {
        id: claim.id * 100 + 2,
        image: `https://picsum.photos/seed/${claim.id}-2/1200/800`,
        url: `https://picsum.photos/seed/${claim.id}-2/1200/800`,
      },
    },
  ],
  latest_resubmission:
    claim.state === 'RESUBMIT'
      ? {
          id: claim.id * 1000,
          source: 'QUALITY',
          notes: 'Please provide more evidence.',
          created: '2026-04-22T10:00:00Z',
          entries: [
            {
              id: claim.id * 10000,
              required_item: 'SITE_CONDITION',
              response_text: '',
              created: '2026-04-22T10:00:00Z',
            },
          ],
        }
      : null,
});

const toClaimCardCounts = () => {
  const submitted = claimStore.filter(item => item.state === 'SUBMITTED').length;
  const approved = claimStore.filter(item => item.state === 'APPROVED' || item.state === 'QA_APPROVED').length;
  const rejected = claimStore.filter(item => item.state === 'REJECTED' || item.state === 'QA_REJECTED').length;

  return {
    totalClaims: claimStore.length,
    submitted,
    approved,
    rejected,
  };
};

const parseClaimId = (url: string): number | null => {
  const matched = url.match(/\/api\/v1\/warranty\/claims\/(\d+)\/?(?:\?.*)?$/);
  if (!matched) {
    return null;
  }

  const parsed = Number.parseInt(matched[1] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseStateFromSearch = (url: string): string | null => {
  const state = new URL(url).searchParams.get('state');
  return state?.trim().toUpperCase() ?? null;
};

const readBodyAsRecord = (request: { postDataJSON: () => unknown }): Record<string, unknown> => {
  try {
    const payload = request.postDataJSON();
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

const applyClaimPatch = (claim: ClaimRecord, payload: Record<string, unknown>) => {
  const action = typeof payload.action === 'string' ? payload.action : null;

  if (action === 'IN_REVIEW') {
    claim.state = 'IN_REVIEW';
  }

  if (action === 'FORWARDED' || action === 'SEND_TO_QUALITY') {
    claim.state = 'QA_REVIEW';
    claim.forwardedBy = 'CS Team';
    claim.forwardedAt = new Date().toISOString();
  }

  if (action === 'REJECT') {
    claim.state = 'QA_REJECTED';
  }

  if (action === 'APPROVE') {
    claim.state = 'QA_APPROVED';
  }

  if (action === 'REQUEST_INFO') {
    claim.state = 'RESUBMIT';
  }

  claim.modified = new Date().toISOString();
};

export const claimsHandlers: MockRouteDefinition[] = [
  {
    id: 'claims-list',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/claims\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const state = parseStateFromSearch(request.url());
      const search = new URL(request.url()).searchParams.get('search')?.trim().toLowerCase() ?? '';
      const issueType = new URL(request.url()).searchParams.get('issue_type')?.trim().toUpperCase() ?? '';

      const filtered = claimStore
        .filter(item => (state ? item.state === state : true))
        .filter(item => (issueType ? item.issueType === issueType : true))
        .filter(item => {
          if (!search) {
            return true;
          }

          return (
            item.claimNumber.toLowerCase().includes(search) ||
            item.registrationNumber.toLowerCase().includes(search) ||
            item.customerName.toLowerCase().includes(search)
          );
        });

      return {
        status: 200,
        body: {
          count: filtered.length,
          next: null,
          previous: null,
          results: filtered.map(toClaimListItem),
        },
      };
    },
  },
  {
    id: 'claims-create',
    method: 'POST',
    url: /.*\/api\/v1\/warranty\/claims\/?(?:\?.*)?$/,
    handle: () => ({
      status: 201,
      body: { detail: 'Claim created.' },
    }),
  },
  {
    id: 'claim-detail',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/claims\/\d+\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const claimId = parseClaimId(request.url());
      const claim = claimStore.find(item => item.id === claimId);

      if (!claim) {
        return {
          status: 404,
          body: { detail: 'Claim not found.' },
        };
      }

      return {
        status: 200,
        body: toClaimDetail(claim),
      };
    },
  },
  {
    id: 'claim-update',
    method: 'PATCH',
    url: /.*\/api\/v1\/warranty\/claims\/\d+\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const claimId = parseClaimId(request.url());
      const claim = claimStore.find(item => item.id === claimId);

      if (!claim) {
        return {
          status: 404,
          body: { detail: 'Claim not found.' },
        };
      }

      const payload = readBodyAsRecord(request);
      applyClaimPatch(claim, payload);

      return {
        status: 200,
        body: toClaimDetail(claim),
      };
    },
  },
  {
    id: 'claim-csr-resubmission-request',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/claims\/\d+\/csr-resubmission\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const claimId = parseClaimId(request.url().replace('/csr-resubmission', ''));
      return {
        status: 200,
        body: {
          claimId: String(claimId ?? 0),
          claimState: 'RESUBMIT',
          qualityReviewId: '9001',
          qualityNotes: 'Upload site condition details.',
          otherText: '',
          requestedItems: [
            {
              requiredItem: 'SITE_CONDITION',
              label: 'Site condition details',
              inputType: 'TEXT',
              isMultiple: false,
            },
          ],
          created: '2026-04-22T10:00:00Z',
        },
      };
    },
  },
  {
    id: 'claim-csr-resubmission-submit',
    method: 'POST',
    url: /.*\/api\/v1\/warranty\/claims\/\d+\/csr-resubmission\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const claimId = parseClaimId(request.url().replace('/csr-resubmission', ''));
      const claim = claimStore.find(item => item.id === claimId);

      if (claim) {
        claim.state = 'QA_REVIEW';
        claim.modified = new Date().toISOString();
      }

      return {
        status: 200,
        body: claim ? toClaimDetail(claim) : { detail: 'Submitted.' },
      };
    },
  },
  {
    id: 'claims-card-counts',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/card-counts\/claims\/?(?:\?.*)?$/,
    handle: () => ({
      status: 200,
      body: toClaimCardCounts(),
    }),
  },
  {
    id: 'quality-approve',
    method: 'POST',
    url: /.*\/api\/v1\/warranty\/claims\/\d+\/quality\/approve\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const claimId = parseClaimId(request.url().replace('/quality/approve', ''));
      const claim = claimStore.find(item => item.id === claimId);

      if (claim) {
        claim.state = 'QA_APPROVED';
        claim.modified = new Date().toISOString();
      }

      return {
        status: 200,
        body: claim ? toClaimDetail(claim) : { detail: 'Approved.' },
      };
    },
  },
  {
    id: 'quality-reject',
    method: 'POST',
    url: /.*\/api\/v1\/warranty\/claims\/\d+\/quality\/reject\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const claimId = parseClaimId(request.url().replace('/quality/reject', ''));
      const claim = claimStore.find(item => item.id === claimId);

      if (claim) {
        claim.state = 'QA_REJECTED';
        claim.modified = new Date().toISOString();
      }

      return {
        status: 200,
        body: claim ? toClaimDetail(claim) : { detail: 'Rejected.' },
      };
    },
  },
  {
    id: 'quality-request-info',
    method: 'POST',
    url: /.*\/api\/v1\/warranty\/claims\/\d+\/quality\/request-info\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const claimId = parseClaimId(request.url().replace('/quality/request-info', ''));
      const claim = claimStore.find(item => item.id === claimId);

      if (claim) {
        claim.state = 'RESUBMIT';
        claim.modified = new Date().toISOString();
      }

      return {
        status: 200,
        body: claim ? toClaimDetail(claim) : { detail: 'Requested.' },
      };
    },
  },
];
