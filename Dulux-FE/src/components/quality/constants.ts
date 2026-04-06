import type { QualityQueueStatusFilter } from '#/types/quality.types';

export const QUALITY_STATUS_TABS: ReadonlyArray<{ value: QualityQueueStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'forwarded', label: 'Awaiting Review' },
  { value: 'infoRequested', label: 'Info Requested' },
  { value: 'resolved', label: 'Resolved' },
];

export const QUALITY_ASSESSMENTS: readonly string[] = [
  'Surface preparation issue identified',
  'Moisture ingress confirmed',
  'Application method issue',
  'Batch quality concern',
  'Approved under warranty policy',
];

export const QUALITY_REJECTION_REASONS: readonly string[] = [
  'Out of warranty scope',
  'Insufficient technical evidence',
  'Application conditions not compliant',
  'Non-covered substrate condition',
];

export const QUALITY_REQUEST_INFO_ITEMS: readonly string[] = [
  'Additional photos (different angles)',
  'Proof of purchase / Invoice',
  'Product batch number',
  'Application details (method, coats, surface prep)',
  'Timeline of issue occurrence',
];
