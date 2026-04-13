import type { QualityQueueStatusFilter } from '#/types/quality.types';
import { QUALITY_REQUIRED_ITEMS, QUALITY_TECHNICAL_REASONS } from '#/types/quality.types';

export const QUALITY_STATUS_TABS: ReadonlyArray<{ value: QualityQueueStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'forwarded', label: 'QA Review' },
  { value: 'infoRequested', label: 'Resubmit' },
  { value: 'resolved', label: 'Resolved' },
];

const toLabel = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

export const QUALITY_REJECTION_REASONS: ReadonlyArray<{
  value: (typeof QUALITY_TECHNICAL_REASONS)[number];
  label: string;
}> = QUALITY_TECHNICAL_REASONS.map(reason => ({
  value: reason,
  label: toLabel(reason),
}));

export const QUALITY_REQUEST_INFO_ITEMS: ReadonlyArray<{
  value: (typeof QUALITY_REQUIRED_ITEMS)[number];
  label: string;
}> = QUALITY_REQUIRED_ITEMS.map(item => ({
  value: item,
  label: toLabel(item),
}));
