import type { MockRouteDefinition } from '../routes';

interface RegistrationRecord {
  id: number;
  registrationCode: string;
  channel: 'WEBFORM' | 'WEB';
  state: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'RESUBMIT' | 'IN_PROGRESS';
  customerName: string;
  phoneNumber: string;
  email: string;
  city: string;
  siteAddress: string;
  purchaseDate: string;
  purchaseDealer: string;
  purchaseDealerCity: string;
  purchaseDealerAddress: string;
  postalCode: string;
  notes: string;
  created: string;
  modified: string;
}

const registrationStore: RegistrationRecord[] = [
  {
    id: 101,
    registrationCode: 'REG-101',
    channel: 'WEBFORM',
    state: 'SUBMITTED',
    customerName: 'Ali Khan',
    phoneNumber: '03001234567',
    email: 'ali@example.com',
    city: 'Karachi',
    siteAddress: 'DHA Phase 6',
    purchaseDate: '2026-04-20',
    purchaseDealer: 'Color House',
    purchaseDealerCity: 'Karachi',
    purchaseDealerAddress: 'Main Shahrah-e-Faisal',
    postalCode: '75500',
    notes: 'Customer requested quick review.',
    created: '2026-04-20T08:00:00Z',
    modified: '2026-04-20T08:00:00Z',
  },
  {
    id: 102,
    registrationCode: 'REG-102',
    channel: 'WEB',
    state: 'APPROVED',
    customerName: 'Sara Ali',
    phoneNumber: '03007654321',
    email: 'sara@example.com',
    city: 'Lahore',
    siteAddress: 'Model Town',
    purchaseDate: '2026-04-19',
    purchaseDealer: 'Paint Hub',
    purchaseDealerCity: 'Lahore',
    purchaseDealerAddress: 'MM Alam Road',
    postalCode: '54000',
    notes: 'All required fields verified.',
    created: '2026-04-19T09:00:00Z',
    modified: '2026-04-19T10:00:00Z',
  },
  {
    id: 103,
    registrationCode: 'REG-103',
    channel: 'WEBFORM',
    state: 'RESUBMIT',
    customerName: 'Imran Shah',
    phoneNumber: '03111222333',
    email: 'imran@example.com',
    city: 'Islamabad',
    siteAddress: 'F-11 Markaz',
    purchaseDate: '2026-04-18',
    purchaseDealer: 'Wall Masters',
    purchaseDealerCity: 'Islamabad',
    purchaseDealerAddress: 'Blue Area',
    postalCode: '44000',
    notes: 'Need clearer invoices.',
    created: '2026-04-18T11:00:00Z',
    modified: '2026-04-18T11:30:00Z',
  },
  {
    id: 104,
    registrationCode: 'REG-104',
    channel: 'WEBFORM',
    state: 'SUBMITTED',
    customerName: 'Ayesha Noor',
    phoneNumber: '03005551234',
    email: 'ayesha@example.com',
    city: 'Karachi',
    siteAddress: 'Gulshan-e-Iqbal',
    purchaseDate: '2026-04-17',
    purchaseDealer: 'Bright Paints',
    purchaseDealerCity: 'Karachi',
    purchaseDealerAddress: 'University Road',
    postalCode: '75300',
    notes: 'Follow-up requested by dealer.',
    created: '2026-04-17T09:00:00Z',
    modified: '2026-04-17T09:00:00Z',
  },
  {
    id: 105,
    registrationCode: 'REG-105',
    channel: 'WEB',
    state: 'SUBMITTED',
    customerName: 'Kamran Malik',
    phoneNumber: '03009997654',
    email: 'kamran@example.com',
    city: 'Lahore',
    siteAddress: 'Johar Town',
    purchaseDate: '2026-04-16',
    purchaseDealer: 'Color Depot',
    purchaseDealerCity: 'Lahore',
    purchaseDealerAddress: 'Canal Road',
    postalCode: '54700',
    notes: 'Pending verification.',
    created: '2026-04-16T10:30:00Z',
    modified: '2026-04-16T10:30:00Z',
  },
  {
    id: 106,
    registrationCode: 'REG-106',
    channel: 'WEBFORM',
    state: 'SUBMITTED',
    customerName: 'Bilal Ahmed',
    phoneNumber: '03008884567',
    email: 'bilal@example.com',
    city: 'Islamabad',
    siteAddress: 'G-13 Markaz',
    purchaseDate: '2026-04-15',
    purchaseDealer: 'Prime Coats',
    purchaseDealerCity: 'Islamabad',
    purchaseDealerAddress: 'I-8 Markaz',
    postalCode: '44000',
    notes: 'Awaiting document confirmation.',
    created: '2026-04-15T08:30:00Z',
    modified: '2026-04-15T08:30:00Z',
  },
];

const toRegistrationListResponse = (stateFilter: string | null, search: string | null) => {
  const normalizedState = stateFilter?.trim().toUpperCase() ?? '';
  const normalizedSearch = search?.trim().toLowerCase() ?? '';

  const results = registrationStore
    .filter(item => {
      if (!normalizedState) {
        return true;
      }

      return item.state === normalizedState;
    })
    .filter(item => {
      if (!normalizedSearch) {
        return true;
      }

      return (
        item.registrationCode.toLowerCase().includes(normalizedSearch) ||
        item.customerName.toLowerCase().includes(normalizedSearch) ||
        item.phoneNumber.toLowerCase().includes(normalizedSearch)
      );
    })
    .map(item => ({
      id: item.id,
      registrationCode: item.registrationCode,
      channel: item.channel,
      state: item.state,
      customerName: item.customerName,
      phoneNumber: item.phoneNumber,
      created: item.created,
      modified: item.modified,
    }));

  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  };
};

const toRegistrationCardCounts = () => {
  const submitted = registrationStore.filter(item => item.state === 'SUBMITTED').length;
  const approved = registrationStore.filter(item => item.state === 'APPROVED').length;
  const rejected = registrationStore.filter(item => item.state === 'REJECTED').length;

  return {
    total: registrationStore.length,
    submitted,
    approved,
    rejected,
  };
};

const toRegistrationDetailResponse = (registration: RegistrationRecord) => ({
  id: registration.id,
  registrationCode: registration.registrationCode,
  channel: registration.channel,
  state: registration.state,
  customerName: registration.customerName,
  phoneNumber: registration.phoneNumber,
  email: registration.email,
  city: registration.city,
  siteAddress: registration.siteAddress,
  purchaseDate: registration.purchaseDate,
  purchaseDealer: registration.purchaseDealer,
  purchaseDealerCity: registration.purchaseDealerCity,
  purchaseDealerAddress: registration.purchaseDealerAddress,
  postalCode: registration.postalCode,
  notes: registration.notes,
  paintPairs: [
    {
      id: registration.id * 10,
      topcoat: 11,
      topcoatName: 'Dulux Protect Plus',
      topcoatQuantity: '2',
      basecoat: null,
      basecoatName: '',
      basecoatQuantity: null,
    },
  ],
  paintPairInvoices: [
    {
      id: registration.id * 100,
      image: {
        id: registration.id * 1000,
        image: 'https://picsum.photos/seed/invoice/1200/800',
      },
      invoiceType: 'TOPCOAT',
    },
  ],
  rejectionFields: [],
  created: registration.created,
  modified: registration.modified,
});

const parseRegistrationId = (url: string): number | null => {
  const matched = url.match(/\/api\/v1\/warranty\/registrations\/(\d+)\/?(?:\?.*)?$/);
  if (!matched) {
    return null;
  }

  const parsed = Number.parseInt(matched[1] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const updateStateFromAction = (action: unknown, currentState: RegistrationRecord['state']): RegistrationRecord['state'] => {
  if (action === 'APPROVE') {
    return 'APPROVED';
  }

  if (action === 'REJECT') {
    return 'REJECTED';
  }

  if (action === 'RESUBMIT') {
    return 'RESUBMIT';
  }

  return currentState;
};

export const registrationsHandlers: MockRouteDefinition[] = [
  {
    id: 'registrations-list',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/registrations\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const url = new URL(request.url());
      const state = url.searchParams.get('state');
      const search = url.searchParams.get('search');

      return {
        status: 200,
        body: toRegistrationListResponse(state, search),
      };
    },
  },
  {
    id: 'registrations-create-manual',
    method: 'POST',
    url: /.*\/api\/v1\/warranty\/registrations\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const payload = request.postDataJSON() as Record<string, unknown> | null;
      const nextId = Math.max(...registrationStore.map(item => item.id)) + 1;
      const nowIso = new Date().toISOString();

      const createdRecord: RegistrationRecord = {
        id: nextId,
        registrationCode: `REG-${nextId}`,
        channel: 'WEBFORM',
        state: 'SUBMITTED',
        customerName: typeof payload?.customerName === 'string' ? payload.customerName : 'Manual Customer',
        phoneNumber: typeof payload?.phoneNumber === 'string' ? payload.phoneNumber : '923000000000',
        email: typeof payload?.email === 'string' ? payload.email : 'manual@example.com',
        city: typeof payload?.city === 'string' ? payload.city : 'Karachi',
        siteAddress: typeof payload?.siteAddress === 'string' ? payload.siteAddress : 'N/A',
        purchaseDate: typeof payload?.purchaseDate === 'string' ? payload.purchaseDate : '2026-04-20',
        purchaseDealer: typeof payload?.purchaseDealer === 'string' ? payload.purchaseDealer : 'Color House',
        purchaseDealerCity: typeof payload?.purchaseDealerCity === 'string' ? payload.purchaseDealerCity : 'Karachi',
        purchaseDealerAddress:
          typeof payload?.purchaseDealerAddress === 'string' ? payload.purchaseDealerAddress : 'Main Road',
        postalCode: typeof payload?.postalCode === 'string' ? payload.postalCode : '',
        notes: typeof payload?.notes === 'string' ? payload.notes : '',
        created: nowIso,
        modified: nowIso,
      };

      registrationStore.unshift(createdRecord);

      return {
        status: 201,
        body: {
          id: createdRecord.id,
          registrationCode: createdRecord.registrationCode,
        },
      };
    },
  },
  {
    id: 'registration-detail',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/registrations\/\d+\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const id = parseRegistrationId(request.url());
      const registration = registrationStore.find(item => item.id === id);

      if (!registration) {
        return {
          status: 404,
          body: { detail: 'Registration not found.' },
        };
      }

      return {
        status: 200,
        body: toRegistrationDetailResponse(registration),
      };
    },
  },
  {
    id: 'registration-update',
    method: 'PATCH',
    url: /.*\/api\/v1\/warranty\/registrations\/\d+\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const id = parseRegistrationId(request.url());
      const registration = registrationStore.find(item => item.id === id);

      if (!registration) {
        return {
          status: 404,
          body: { detail: 'Registration not found.' },
        };
      }

      const payload = request.postDataJSON() as Record<string, unknown> | null;
      registration.state = updateStateFromAction(payload?.action, registration.state);
      registration.modified = new Date().toISOString();

      return {
        status: 200,
        body: toRegistrationDetailResponse(registration),
      };
    },
  },
  {
    id: 'registrations-card-counts',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/card-counts\/registrations\/?(?:\?.*)?$/,
    handle: () => ({
      status: 200,
      body: toRegistrationCardCounts(),
    }),
  },
];
