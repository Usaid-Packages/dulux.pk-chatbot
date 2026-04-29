export const AUDIT_TIMELINE_LONG_TEXT_LIMIT = 180;
export const AUDIT_TIMELINE_JSON_PREVIEW_LIMIT = 240;

export const AUDIT_TIMELINE_STATE_CHANGE_FIELDS = new Set(['state', 'workflow_state', 'workflowState', 'status']);
export const AUDIT_TIMELINE_IMAGE_CHANGE_FIELDS = new Set(['images', 'image_ids', 'imageids']);
export const AUDIT_TIMELINE_ASSIGNEE_CHANGE_FIELDS = new Set(['assigned_to', 'assignedto']);
export const AUDIT_TIMELINE_ID_LIST_CHANGE_FIELDS = new Set(['quality_review_ids', 'qualityreviewids']);
export const AUDIT_TIMELINE_RESUBMISSION_CHANGE_FIELDS = new Set(['resubmissions', 'resubmission']);

export const AUDIT_TIMELINE_FIELD_LABEL_OVERRIDES: Record<string, string> = {
  approved_at: 'Approved at',
  approvedat: 'Approved at',
  approved_by: 'Approved by',
  approvedby: 'Approved by',
  rejection_fields: 'Rejected Fields',
  rejectionfields: 'Rejected Fields',
};
