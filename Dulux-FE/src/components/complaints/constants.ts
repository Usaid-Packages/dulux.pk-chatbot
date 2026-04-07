import type { ComplaintApiStatus, ConversationStatusFilter } from '#/types/complaints';

export const CONVERSATION_STATUS_TABS: Array<{ label: string; value: ConversationStatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Closed', value: 'CLOSED' },
];

export const CONVERSATION_STATUS_LABELS: Record<ComplaintApiStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const CONVERSATION_STATUS_CLASSNAMES: Record<ComplaintApiStatus, string> = {
  OPEN: 'bg-convStatus-active-bg text-convStatus-active-text',
  IN_PROGRESS: 'bg-convStatus-active-bg text-convStatus-active-text',
  RESOLVED: 'bg-convStatus-resolved-bg text-convStatus-resolved-text',
  CLOSED: 'bg-convStatus-resolved-bg text-convStatus-resolved-text',
};

export const CONVERSATION_CHANNEL_LABELS = {
  whatsapp: 'WhatsApp',
  manual: 'Manual Entry',
} as const;
