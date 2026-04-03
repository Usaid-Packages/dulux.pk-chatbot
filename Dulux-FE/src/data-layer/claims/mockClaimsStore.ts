import type {
  ApproveClaimPayload,
  ClaimDetail,
  ClaimListItem,
  ClaimListStatusFilter,
  ClaimsListRequestParams,
  ClaimsListResponse,
  ClaimStatus,
  RejectClaimPayload,
  RequestMoreInfoPayload,
  SendToQualityPayload,
} from '#/types/claims.types';

const nowIso = (): string => new Date().toISOString();

const cloneClaim = (claim: ClaimDetail): ClaimDetail => {
  return {
    ...claim,
    evidencePhotos: claim.evidencePhotos.map(photo => ({ ...photo })),
    timeline: claim.timeline.map(item => ({ ...item })),
    linkedRegistration: { ...claim.linkedRegistration },
  };
};

const initialClaims: ClaimDetail[] = [
  {
    id: '1',
    claimNumber: 'CL-204',
    customerName: 'Hina Saleem',
    registrationId: 'REG-1890',
    issueType: 'Peeling',
    photoCount: 3,
    submittedAt: '2026-03-29T09:12:00.000Z',
    status: 'pending',
    priority: 'high',
    phone: '+92-300-1112233',
    city: 'Karachi',
    areaSqFt: 780,
    topcoat: 'Dulux WeatherShield',
    batchNumber: 'WS-22-11',
    description: 'Wall paint started peeling near balcony area within three weeks.',
    csNotes: 'Customer says site had shade and no direct rain ingress.',
    evidencePhotos: [
      { id: 'p1', label: 'Long Shot', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1280' },
      {
        id: 'p2',
        label: 'Close Shot',
        url: 'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?w=1280',
      },
      {
        id: 'p3',
        label: 'Alternate Angle',
        url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1280',
      },
    ],
    linkedRegistration: {
      registrationId: 'REG-1890',
      customerName: 'Hina Saleem',
      purchaseDate: '2026-02-21',
      dealerName: 'Royal Paint Store',
      status: 'Approved',
    },
    timeline: [
      { id: 't1', event: 'Claim created', actor: 'System', createdAt: '2026-03-29T09:12:00.000Z' },
      { id: 't2', event: 'Assigned to CS queue', actor: 'System', createdAt: '2026-03-29T09:13:00.000Z' },
    ],
  },
  {
    id: '2',
    claimNumber: 'CL-205',
    customerName: 'Ali Raza',
    registrationId: 'REG-1875',
    issueType: 'Discoloration',
    photoCount: 3,
    submittedAt: '2026-03-30T11:20:00.000Z',
    status: 'forwarded',
    priority: 'normal',
    phone: '+92-333-8884412',
    city: 'Lahore',
    areaSqFt: 600,
    topcoat: 'Dulux Inspire',
    batchNumber: 'IN-04-77',
    description: 'Top section became darker than lower section after one month.',
    csNotes: 'Forwarded for technical moisture assessment.',
    verificationPackSummary: 'Invoice + 3 images + contractor details attached.',
    evidencePhotos: [
      { id: 'p1', label: 'Long Shot', url: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=1280' },
      { id: 'p2', label: 'Close Shot', url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1280' },
      {
        id: 'p3',
        label: 'Alternate Angle',
        url: 'https://images.unsplash.com/photo-1560448075-bb485b067938?w=1280',
      },
    ],
    linkedRegistration: {
      registrationId: 'REG-1875',
      customerName: 'Ali Raza',
      purchaseDate: '2026-02-09',
      dealerName: 'City Colors',
      status: 'Approved',
    },
    timeline: [
      { id: 't1', event: 'Claim created', actor: 'System', createdAt: '2026-03-30T11:20:00.000Z' },
      {
        id: 't2',
        event: 'Sent to quality',
        actor: 'Amina (CS)',
        createdAt: '2026-03-31T08:22:00.000Z',
        note: 'Possible substrate moisture issue.',
      },
    ],
  },
  {
    id: '3',
    claimNumber: 'CL-206',
    customerName: 'Sana Javed',
    registrationId: 'REG-1901',
    issueType: 'Cracking',
    photoCount: 3,
    submittedAt: '2026-03-28T16:40:00.000Z',
    status: 'resolved',
    priority: 'normal',
    phone: '+92-301-1119000',
    city: 'Islamabad',
    areaSqFt: 450,
    topcoat: 'Dulux Weathershield Max',
    batchNumber: 'WM-91-44',
    description: 'Hairline cracks visible after curing period.',
    qualityNotes: 'Approved claim with replacement product recommendation.',
    evidencePhotos: [
      { id: 'p1', label: 'Long Shot', url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1280' },
      { id: 'p2', label: 'Close Shot', url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1280' },
      {
        id: 'p3',
        label: 'Alternate Angle',
        url: 'https://images.unsplash.com/photo-1616594039964-3de2ef8f8f8d?w=1280',
      },
    ],
    linkedRegistration: {
      registrationId: 'REG-1901',
      customerName: 'Sana Javed',
      purchaseDate: '2026-01-30',
      dealerName: 'Prime Traders',
      status: 'Approved',
    },
    timeline: [
      { id: 't1', event: 'Claim created', actor: 'System', createdAt: '2026-03-28T16:40:00.000Z' },
      { id: 't2', event: 'Sent to quality', actor: 'Kamran (CS)', createdAt: '2026-03-29T08:00:00.000Z' },
      {
        id: 't3',
        event: 'Resolved',
        actor: 'Nadia (QA)',
        createdAt: '2026-03-30T13:35:00.000Z',
        note: 'Compensation approved.',
      },
    ],
  },
  {
    id: '4',
    claimNumber: 'CL-207',
    customerName: 'Imran Haq',
    registrationId: 'REG-1911',
    issueType: 'Blistering',
    photoCount: 3,
    submittedAt: '2026-04-01T10:12:00.000Z',
    status: 'infoRequested',
    priority: 'high',
    phone: '+92-334-7771200',
    city: 'Faisalabad',
    areaSqFt: 510,
    topcoat: 'Dulux Inspire',
    batchNumber: 'IN-14-20',
    description: 'Bubbles appeared near kitchen steam zone.',
    csNotes: 'Requested more photos and ventilation details from customer.',
    evidencePhotos: [
      { id: 'p1', label: 'Long Shot', url: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1280' },
      {
        id: 'p2',
        label: 'Close Shot',
        url: 'https://images.unsplash.com/photo-1583845112203-29329902332e?w=1280',
      },
      {
        id: 'p3',
        label: 'Alternate Angle',
        url: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=1280',
      },
    ],
    linkedRegistration: {
      registrationId: 'REG-1911',
      customerName: 'Imran Haq',
      purchaseDate: '2026-03-03',
      dealerName: 'Paint House',
      status: 'Approved',
    },
    timeline: [
      { id: 't1', event: 'Claim created', actor: 'System', createdAt: '2026-04-01T10:12:00.000Z' },
      {
        id: 't2',
        event: 'More information requested',
        actor: 'Amina (CS)',
        createdAt: '2026-04-01T12:01:00.000Z',
        note: 'Need alternate angles and product batch photo.',
      },
    ],
  },
];

let claimStore: ClaimDetail[] = initialClaims.map(cloneClaim);

const toListItem = (claim: ClaimDetail): ClaimListItem => {
  const { evidencePhotos, ...listFields } = claim;
  return {
    ...listFields,
    photoCount: evidencePhotos.length,
  };
};

const sortBySubmittedDateDesc = (left: ClaimDetail, right: ClaimDetail): number => {
  return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
};

const matchesStatus = (claimStatus: ClaimStatus, filterStatus: ClaimListStatusFilter): boolean => {
  if (filterStatus === 'all') {
    return true;
  }
  return claimStatus === filterStatus;
};

const matchesDateRange = (submittedAt: string, fromDate?: string, toDate?: string): boolean => {
  const submittedDate = new Date(submittedAt).getTime();
  if (Number.isNaN(submittedDate)) {
    return false;
  }

  const fromTime = fromDate ? new Date(fromDate).getTime() : undefined;
  const toTime = toDate ? new Date(toDate).getTime() : undefined;

  if (fromTime !== undefined && !Number.isNaN(fromTime) && submittedDate < fromTime) {
    return false;
  }

  if (toTime !== undefined && !Number.isNaN(toTime) && submittedDate > toTime) {
    return false;
  }

  return true;
};

const updateClaimInStore = (id: string, mutate: (claim: ClaimDetail) => ClaimDetail): ClaimDetail => {
  const claimIndex = claimStore.findIndex(claim => claim.id === id);
  if (claimIndex < 0) {
    throw new Error('Claim not found.');
  }

  const updatedClaim = mutate(claimStore[claimIndex]);
  claimStore = claimStore.map((claim, index) => (index === claimIndex ? updatedClaim : claim));
  return cloneClaim(updatedClaim);
};

export const getMockClaims = (params: ClaimsListRequestParams): ClaimsListResponse => {
  const filteredClaims = claimStore
    .filter(claim => matchesStatus(claim.status, params.status))
    .filter(claim => (params.issueType === 'all' ? true : claim.issueType === params.issueType))
    .filter(claim => matchesDateRange(claim.submittedAt, params.fromDate, params.toDate))
    .sort(sortBySubmittedDateDesc);

  const offset = (params.page - 1) * params.pageSize;
  const paginatedItems = filteredClaims.slice(offset, offset + params.pageSize).map(toListItem);

  return {
    items: paginatedItems,
    total: filteredClaims.length,
    page: params.page,
    pageSize: params.pageSize,
    stats: {
      totalClaims: claimStore.length,
      pendingReview: claimStore.filter(claim => claim.status === 'pending').length,
      forwardedToQuality: claimStore.filter(claim => claim.status === 'forwarded').length,
      resolved: claimStore.filter(claim => claim.status === 'resolved').length,
    },
  };
};

export const getMockClaimById = (id: string): ClaimDetail => {
  const claim = claimStore.find(entry => entry.id === id);
  if (!claim) {
    throw new Error('Claim not found.');
  }
  return cloneClaim(claim);
};

export const approveMockClaim = ({ id, notes }: ApproveClaimPayload): ClaimDetail => {
  return updateClaimInStore(id, claim => ({
    ...claim,
    status: 'approved',
    qualityNotes: notes,
    timeline: [
      {
        id: `timeline-${Date.now()}`,
        event: 'Claim approved',
        actor: 'CS Agent',
        createdAt: nowIso(),
        note: notes,
      },
      ...claim.timeline,
    ],
  }));
};

export const sendMockClaimToQuality = ({
  id,
  notes,
  priority,
  verificationPackSummary,
}: SendToQualityPayload): ClaimDetail => {
  return updateClaimInStore(id, claim => ({
    ...claim,
    status: 'forwarded',
    priority,
    csNotes: notes,
    verificationPackSummary,
    timeline: [
      {
        id: `timeline-${Date.now()}`,
        event: 'Sent to quality',
        actor: 'CS Agent',
        createdAt: nowIso(),
        note: notes,
      },
      ...claim.timeline,
    ],
  }));
};

export const rejectMockClaim = ({ id, reason, notes }: RejectClaimPayload): ClaimDetail => {
  const note = notes ? `${reason}: ${notes}` : reason;

  return updateClaimInStore(id, claim => ({
    ...claim,
    status: 'rejected',
    qualityNotes: note,
    timeline: [
      {
        id: `timeline-${Date.now()}`,
        event: 'Claim rejected',
        actor: 'CS Agent',
        createdAt: nowIso(),
        note,
      },
      ...claim.timeline,
    ],
  }));
};

export const requestMockClaimInfo = ({ id, items, note, priority }: RequestMoreInfoPayload): ClaimDetail => {
  const requestSummary = note ? `${items.join(', ')} | ${note}` : items.join(', ');

  return updateClaimInStore(id, claim => ({
    ...claim,
    status: 'infoRequested',
    priority,
    csNotes: requestSummary,
    timeline: [
      {
        id: `timeline-${Date.now()}`,
        event: 'More info requested',
        actor: 'CS Agent',
        createdAt: nowIso(),
        note: requestSummary,
      },
      ...claim.timeline,
    ],
  }));
};
