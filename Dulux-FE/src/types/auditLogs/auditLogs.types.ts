export const AUDIT_LOG_ACTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;
export const AUDIT_LOG_ACTION_FILTERS = ['all', ...AUDIT_LOG_ACTIONS] as const;
export const AUDIT_LOG_ORDERING_FIELDS = ['created', 'id', 'action', 'modelLabel', 'objectId', 'actorEmail'] as const;
export const AUDIT_LOG_DEFAULT_ORDERING = '-created' as const;

export type AuditLogAction = (typeof AUDIT_LOG_ACTIONS)[number];
export type AuditLogActionFilter = (typeof AUDIT_LOG_ACTION_FILTERS)[number];
export type AuditLogOrderingField = (typeof AUDIT_LOG_ORDERING_FIELDS)[number];
export type AuditLogOrdering = AuditLogOrderingField | `-${AuditLogOrderingField}`;

export interface AuditLogOrderingOption {
  label: string;
  value: AuditLogOrdering;
}

export const AUDIT_LOG_ORDERING_OPTIONS: AuditLogOrderingOption[] = [
  { label: 'Latest first', value: '-created' },
  { label: 'Oldest first', value: 'created' },
  { label: 'Actor email (A-Z)', value: 'actorEmail' },
  { label: 'Action (A-Z)', value: 'action' },
  { label: 'Model label (A-Z)', value: 'modelLabel' },
  { label: 'Object ID (A-Z)', value: 'objectId' },
  { label: 'ID (Ascending)', value: 'id' },
] as const;

export interface AuditLogListFilters {
  page: number;
  pageSize: number;
  action: AuditLogActionFilter;
  actor: string;
  modelLabel: string;
  objectId: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  ordering: AuditLogOrdering;
}

export interface AuditLogListItem {
  id: number;
  actor: number | null;
  actorEmail: string;
  action: AuditLogAction;
  objectId: string;
  objectRepr: string;
  eventLabel: string;
  registrationNumber: string | null;
  created: string;
}

export type AuditLogChangeSet = Record<string, { before: unknown; after: unknown }>;

export interface AuditLogDetail extends AuditLogListItem {
  changes: AuditLogChangeSet | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
}

export interface AuditLogListResponse {
  total: number;
  next: string | null;
  previous: string | null;
  page: number;
  pageSize: number;
  items: AuditLogListItem[];
}

export interface AuditLogApiListItem extends Record<string, unknown> {
  id: number;
  actor: number | null;
  actorEmail: string;
  action: AuditLogAction;
  modelLabel?: string;
  objectId: string;
  objectRepr: string;
  eventLabel?: string;
  registrationNumber?: string | null;
  created: string;
}

export interface AuditLogApiListResponse extends Record<string, unknown> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: AuditLogApiListItem[];
}

export interface AuditLogApiDetailResponse extends Record<string, unknown> {
  id: number;
  actor: number | null;
  actorEmail: string;
  action: AuditLogAction;
  modelLabel?: string;
  objectId: string;
  objectRepr: string;
  eventLabel?: string;
  registrationNumber?: string | null;
  created: string;
  changes?: Record<string, { before: unknown; after: unknown }> | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
}

export interface AuditLogListApiQuery extends Record<string, string | number> {
  page: number;
  pageSize: number;
  ordering: AuditLogOrdering;
  action?: AuditLogAction;
  actor?: string;
  modelLabel?: string;
  objectId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}
