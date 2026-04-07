import type { ConversationPriority, ConversationStatus } from '#/types/complaints';

export const CONVERSATION_STATUS_TABS: Array<{ label: string; value: 'all' | ConversationStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Unassigned', value: 'unassigned' },
  { label: 'Active', value: 'active' },
  { label: 'Resolved', value: 'resolved' },
];

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  unassigned: 'Unassigned',
  active: 'Active',
  resolved: 'Resolved',
};

export const CONVERSATION_STATUS_CLASSNAMES: Record<ConversationStatus, string> = {
  unassigned: 'bg-convStatus-unassigned-bg text-convStatus-unassigned-text',
  active: 'bg-convStatus-active-bg text-convStatus-active-text',
  resolved: 'bg-convStatus-resolved-bg text-convStatus-resolved-text',
};

export const CONVERSATION_PRIORITY_CLASSNAMES: Record<ConversationPriority, string> = {
  high: 'bg-priority-high-bg text-priority-high-text',
  normal: 'bg-priority-normal-bg text-priority-normal-text',
};

export const CONVERSATION_CHANNEL_LABELS = {
  whatsapp: 'WhatsApp',
  manual: 'Manual Entry',
} as const;
