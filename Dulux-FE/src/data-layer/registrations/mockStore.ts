const PAGE_SIZE = 10;
const MOCK_DELAY_MS = 180;

type RegistrationStatus = 'SUBMITTED' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'RESUBMIT';
type RegistrationChannel = 'WHATSAPP' | 'WEB' | 'WEBFORM';

type RegistrationActionPayload = {
  action: 'APPROVE' | 'REJECT' | 'RESUBMIT';
  notes?: string;
  rejectionFields?: Array<{ fieldName: string; note?: string }>;
};

type RegistrationListItem = {
  id: number;
  registrationCode: string;
  customerName: string;
  phoneNumber: string;
  city: string;
  channel: RegistrationChannel;
  state: RegistrationStatus;
  purchaseDate: string;
  created: string;
};

type RegistrationDetail = RegistrationListItem & {
  province: string;
  siteAddress: string;
  purchaseDealer: string;
  purchaseDealerCity: string;
  purchaseDealerAddress: string;
  postalCode: string;
  notes: string;
  approvedBy: number | null;
  approvedByEmail: string | null;
  approvedAt: string | null;
  warrantyCertificate: string | null;
  paintPairs: Array<{
    id: number;
    topcoat: { id: number; name: string; productType: string };
    topcoatQuantity: string;
    basecoat: { id: number; name: string; productType: string } | null;
    basecoatQuantity: string | null;
  }>;
  paintPairInvoices: Array<{
    id: number;
    image: { id: number; image: string };
    invoiceType: 'TOPCOAT' | 'BASECOAT';
  }>;
  modified: string;
  email: string;
};

type RegistrationsQueryParams = {
  search?: unknown;
  state?: unknown;
  page?: unknown;
};

type RegistrationsListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: RegistrationListItem[];
};

const nowIsoString = new Date().toISOString();

const registrationsMap = new Map<string, RegistrationDetail>([
  [
    '101',
    {
      id: 101,
      registrationCode: 'RG-000101',
      channel: 'WHATSAPP',
      state: 'SUBMITTED',
      customerName: 'Ahmed Raza',
      phoneNumber: '923001112233',
      email: 'ahmed.raza@example.com',
      city: 'Karachi',
      province: 'Sindh',
      siteAddress: 'House 12, Block 5, Gulshan-e-Iqbal',
      purchaseDate: '2026-03-15',
      purchaseDealer: 'Color World Traders',
      purchaseDealerCity: 'Karachi',
      purchaseDealerAddress: 'Shahrah-e-Faisal',
      postalCode: '75300',
      notes: 'Customer requested quick processing.',
      approvedBy: null,
      approvedByEmail: null,
      approvedAt: null,
      warrantyCertificate: null,
      paintPairs: [
        {
          id: 1101,
          topcoat: { id: 1, name: 'Dulux WeatherShield', productType: 'TOPCOAT' },
          topcoatQuantity: '8.00',
          basecoat: { id: 3, name: 'Dulux Primer Base', productType: 'BASECOAT' },
          basecoatQuantity: '6.00',
        },
      ],
      paintPairInvoices: [
        {
          id: 2101,
          image: {
            id: 501,
            image: 'https://images.unsplash.com/photo-1556155092-490a1ba16284?auto=format&fit=crop&w=1200&q=80',
          },
          invoiceType: 'TOPCOAT',
        },
        {
          id: 2102,
          image: {
            id: 502,
            image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
          },
          invoiceType: 'BASECOAT',
        },
      ],
      created: nowIsoString,
      modified: nowIsoString,
    },
  ],
  [
    '102',
    {
      id: 102,
      registrationCode: 'RG-000102',
      channel: 'WEBFORM',
      state: 'APPROVED',
      customerName: 'Sara Khan',
      phoneNumber: '923331114455',
      email: 'sara.khan@example.com',
      city: 'Lahore',
      province: 'Punjab',
      siteAddress: 'Street 14, DHA Phase 6',
      purchaseDate: '2026-03-09',
      purchaseDealer: 'Paint Hub',
      purchaseDealerCity: 'Lahore',
      purchaseDealerAddress: 'MM Alam Road',
      postalCode: '54000',
      notes: 'Verified by CS team.',
      approvedBy: 11,
      approvedByEmail: 'cs.agent@dulux.local',
      approvedAt: '2026-03-21T08:45:00.000Z',
      warrantyCertificate: null,
      paintPairs: [
        {
          id: 1102,
          topcoat: { id: 2, name: 'Dulux EasyClean', productType: 'TOPCOAT' },
          topcoatQuantity: '5.00',
          basecoat: null,
          basecoatQuantity: null,
        },
      ],
      paintPairInvoices: [
        {
          id: 2103,
          image: {
            id: 503,
            image: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
          },
          invoiceType: 'TOPCOAT',
        },
      ],
      created: '2026-03-10T10:20:00.000Z',
      modified: '2026-03-21T08:45:00.000Z',
    },
  ],
  [
    '103',
    {
      id: 103,
      registrationCode: 'RG-000103',
      channel: 'WHATSAPP',
      state: 'RESUBMIT',
      customerName: 'Bilal Ahmed',
      phoneNumber: '923214449900',
      email: 'bilal.ahmed@example.com',
      city: 'Islamabad',
      province: 'Islamabad Capital Territory',
      siteAddress: 'I-8 Markaz, House 9',
      purchaseDate: '2026-02-24',
      purchaseDealer: 'Master Paint Store',
      purchaseDealerCity: 'Islamabad',
      purchaseDealerAddress: 'Blue Area',
      postalCode: '44000',
      notes: 'Please upload clearer invoice image.',
      approvedBy: null,
      approvedByEmail: null,
      approvedAt: null,
      warrantyCertificate: null,
      paintPairs: [
        {
          id: 1103,
          topcoat: { id: 6, name: 'Dulux Velvet Touch', productType: 'TOPCOAT' },
          topcoatQuantity: '7.00',
          basecoat: { id: 9, name: 'Dulux Undercoat', productType: 'BASECOAT' },
          basecoatQuantity: '7.00',
        },
      ],
      paintPairInvoices: [
        {
          id: 2104,
          image: {
            id: 504,
            image: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?auto=format&fit=crop&w=1200&q=80',
          },
          invoiceType: 'TOPCOAT',
        },
      ],
      created: '2026-03-01T09:10:00.000Z',
      modified: '2026-03-24T12:30:00.000Z',
    },
  ],
]);

const wait = async (): Promise<void> => {
  return new Promise(resolve => {
    window.setTimeout(resolve, MOCK_DELAY_MS);
  });
};

const toListItem = (detail: RegistrationDetail): RegistrationListItem => {
  return {
    id: detail.id,
    registrationCode: detail.registrationCode,
    customerName: detail.customerName,
    phoneNumber: detail.phoneNumber,
    city: detail.city,
    channel: detail.channel,
    state: detail.state,
    purchaseDate: detail.purchaseDate,
    created: detail.created,
  };
};

const safeString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
};

const getPage = (value: unknown): number => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1;
};

const getStatusFilter = (value: unknown): RegistrationStatus | undefined => {
  if (typeof value === 'string') {
    const upper = value.toUpperCase();
    if (
      upper === 'SUBMITTED' ||
      upper === 'IN_PROGRESS' ||
      upper === 'APPROVED' ||
      upper === 'REJECTED' ||
      upper === 'RESUBMIT'
    ) {
      return upper;
    }
  }
  return undefined;
};

const matchesSearch = (registration: RegistrationDetail, searchTerm: string): boolean => {
  if (!searchTerm) {
    return true;
  }

  const normalized = searchTerm.toLowerCase();

  return (
    registration.registrationCode.toLowerCase().includes(normalized) ||
    registration.customerName.toLowerCase().includes(normalized) ||
    registration.phoneNumber.toLowerCase().includes(normalized)
  );
};

const cloneDetail = (detail: RegistrationDetail): RegistrationDetail => {
  return structuredClone(detail);
};

const listRegistrations = (params?: RegistrationsQueryParams): RegistrationsListResponse => {
  const searchTerm = safeString(params?.search);
  const stateFilter = getStatusFilter(params?.state);
  const page = getPage(params?.page);

  const filtered = Array.from(registrationsMap.values())
    .filter(registration => matchesSearch(registration, searchTerm))
    .filter(registration => {
      if (!stateFilter) {
        return true;
      }

      return registration.state === stateFilter;
    })
    .sort((firstItem, secondItem) => new Date(secondItem.created).getTime() - new Date(firstItem.created).getTime())
    .map(toListItem);

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const results = filtered.slice(start, end);

  return {
    count: filtered.length,
    next: end < filtered.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results,
  };
};

const getRegistrationById = (id: string): RegistrationDetail => {
  const registration = registrationsMap.get(id);

  if (!registration) {
    throw new Error('Registration not found.');
  }

  return cloneDetail(registration);
};

const applyAction = (id: string, payload: RegistrationActionPayload): void => {
  const registration = registrationsMap.get(id);

  if (!registration) {
    throw new Error('Registration not found.');
  }

  const timestamp = new Date().toISOString();

  if (payload.action === 'APPROVE') {
    registration.state = 'APPROVED';
    registration.approvedAt = timestamp;
    registration.approvedBy = registration.approvedBy ?? 999;
    registration.approvedByEmail = registration.approvedByEmail ?? 'agent@dulux.local';
  }

  if (payload.action === 'REJECT') {
    registration.state = 'REJECTED';
    registration.notes = payload.notes ?? registration.notes;
    registration.approvedAt = null;
    registration.approvedBy = null;
    registration.approvedByEmail = null;
  }

  if (payload.action === 'RESUBMIT') {
    registration.state = 'RESUBMIT';
    registration.notes = payload.notes ?? registration.notes;
    registration.approvedAt = null;
    registration.approvedBy = null;
    registration.approvedByEmail = null;
  }

  registration.modified = timestamp;
};

export const registrationsMockStore = {
  async fetchRegistrations(params?: RegistrationsQueryParams): Promise<RegistrationsListResponse> {
    await wait();
    return listRegistrations(params);
  },
  async fetchRegistrationById(id: string): Promise<RegistrationDetail> {
    await wait();
    return getRegistrationById(id);
  },
  async applyRegistrationAction(id: string, payload: RegistrationActionPayload): Promise<void> {
    await wait();
    applyAction(id, payload);
  },
};
