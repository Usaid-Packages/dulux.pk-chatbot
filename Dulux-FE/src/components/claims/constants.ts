import type { ClaimListStatusFilter } from '#/types/claims.types';

export const CLAIM_STATUS_TABS: ReadonlyArray<{ value: ClaimListStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Pending' },
  { value: 'inReview', label: 'In Review' },
  { value: 'forwarded', label: 'QA Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'infoRequested', label: 'Resubmit' },
];

export const CLAIM_REJECTION_REASONS = [
  'Out of warranty period',
  'Insufficient evidence',
  'Application issue (not product defect)',
  'Non-Dulux product used',
  'Duplicate claim',
] as const;

export const REQUEST_INFO_ITEMS = [
  'Additional photos (different angles)',
  'Proof of purchase / Invoice',
  'Product batch number',
  'Application details (method, coats, surface prep)',
  'Timeline of issue occurrence',
  'Other',
] as const;
