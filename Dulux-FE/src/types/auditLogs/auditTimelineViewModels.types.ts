import type { AuditTimelineItem } from './auditLogs.types';

export type StatusBadgeVariant = 'default' | 'pending' | 'approved' | 'qaApproved' | 'rejected' | 'info' | 'resolved';

export interface RejectionFieldChangeItem {
  fieldName: string;
  note: string | null;
}

export interface TimelineImagePreviewItem {
  id: string;
  url: string;
}

export interface ResubmissionEntrySummary {
  requiredItemLabel: string;
  hasResponseText: boolean;
  hasImage: boolean;
  responsePreview: string | null;
}

export interface ResubmissionSummary {
  id: number | null;
  source: string | null;
  note: string | null;
  entries: ResubmissionEntrySummary[];
}

export interface AuditTimelineEntrySummaryViewModel {
  requiredItemLabel: string;
  hasResponseText: boolean;
  hasImage: boolean;
  responsePreview: string | null;
}

export interface AuditTimelineResubmissionViewModel {
  source: string | null;
  note: string | null;
  totalEntries: number;
  answeredEntries: number;
  entries: AuditTimelineEntrySummaryViewModel[];
}

export interface AuditTimelineStateTransitionViewModel {
  beforeToken: string;
  afterToken: string;
}

interface BaseChangeViewModel {
  key: string;
  fieldLabel: string;
}

export interface DefaultChangeViewModel extends BaseChangeViewModel {
  kind: 'default';
  fullBefore: string;
  fullAfter: string;
  compactBefore: string;
  compactAfter: string;
}

export interface ComplexChangeViewModel extends BaseChangeViewModel {
  kind: 'complex';
  beforeSummary: string;
  afterSummary: string;
  beforeRaw: string;
  afterRaw: string;
  beforePreview: string;
  afterPreview: string;
}

export interface ImageChangeViewModel extends BaseChangeViewModel {
  kind: 'image';
  beforeSummary: string;
  afterSummary: string;
  beforePreviewItems: TimelineImagePreviewItem[];
  afterPreviewItems: TimelineImagePreviewItem[];
}

export interface RejectionFieldsChangeViewModel extends BaseChangeViewModel {
  kind: 'rejectionFields';
  beforeSummary: string;
  afterSummary: string;
  compactBefore: string;
  compactAfter: string;
}

export interface IdListChangeViewModel extends BaseChangeViewModel {
  kind: 'idList';
  beforeSummary: string;
  afterSummary: string;
}

export interface ResubmissionChangeViewModel extends BaseChangeViewModel {
  kind: 'resubmission';
  beforeSubmissionCount: number;
  afterSubmissionCount: number;
  latestAfterSummary: AuditTimelineResubmissionViewModel | null;
}

export type AuditTimelineChangeViewModel =
  | DefaultChangeViewModel
  | ComplexChangeViewModel
  | ImageChangeViewModel
  | RejectionFieldsChangeViewModel
  | IdListChangeViewModel
  | ResubmissionChangeViewModel;

export interface AuditTimelineItemViewModel {
  key: string;
  eventType: string;
  user: string;
  actorEmail: string;
  action: AuditTimelineItem['action'];
  performedAtLabel: string;
  registrationNumber: string | null;
  updatedFields: Array<{ key: string; label: string }>;
  stateTransition: AuditTimelineStateTransitionViewModel | null;
  detailChanges: AuditTimelineChangeViewModel[];
}
