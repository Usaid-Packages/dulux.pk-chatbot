import {
  AUDIT_TIMELINE_ASSIGNEE_CHANGE_FIELDS,
  AUDIT_TIMELINE_DATE_TIME_FORMATTER,
  AUDIT_TIMELINE_FIELD_LABEL_OVERRIDES,
  AUDIT_TIMELINE_ID_LIST_CHANGE_FIELDS,
  AUDIT_TIMELINE_IMAGE_CHANGE_FIELDS,
  AUDIT_TIMELINE_JSON_PREVIEW_LIMIT,
  AUDIT_TIMELINE_LONG_TEXT_LIMIT,
  AUDIT_TIMELINE_RESUBMISSION_CHANGE_FIELDS,
  AUDIT_TIMELINE_STATE_CHANGE_FIELDS,
} from '#/constants';
import type {
  AuditTimelineChangeViewModel,
  AuditTimelineItem,
  AuditTimelineItemViewModel,
  AuditTimelineStateTransitionViewModel,
  RejectionFieldChangeItem,
  ResubmissionEntrySummary,
  ResubmissionSummary,
  StatusBadgeVariant,
  TimelineImagePreviewItem,
} from '#/types/auditLogs';

const formatDateTime = (isoDateTime: string): string => {
  const parsedDate = new Date(isoDateTime);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Invalid timestamp';
  }

  return AUDIT_TIMELINE_DATE_TIME_FORMATTER.format(parsedDate);
};

const formatFieldLabel = (fieldName: string): string => {
  const normalizedFieldName = fieldName.trim();
  const normalizedKey = normalizedFieldName.replaceAll('_', '').toLowerCase();
  const overrideLabel =
    AUDIT_TIMELINE_FIELD_LABEL_OVERRIDES[normalizedKey] ??
    AUDIT_TIMELINE_FIELD_LABEL_OVERRIDES[normalizedFieldName.toLowerCase()];

  if (overrideLabel) {
    return overrideLabel;
  }

  return normalizedFieldName
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
};

const isRejectionFieldsField = (fieldName: string): boolean => {
  const normalizedField = fieldName.trim().toLowerCase();
  return normalizedField === 'rejection_fields' || normalizedField === 'rejectionfields';
};

const toRejectionFieldItems = (value: unknown): RejectionFieldChangeItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<RejectionFieldChangeItem[]>((accumulator, item) => {
    if (!isRecordValue(item)) {
      return accumulator;
    }

    const rawFieldName =
      typeof item.field_name === 'string' && item.field_name.trim().length > 0
        ? item.field_name.trim()
        : typeof item.fieldName === 'string' && item.fieldName.trim().length > 0
          ? item.fieldName.trim()
          : null;

    if (!rawFieldName) {
      return accumulator;
    }

    const note = typeof item.note === 'string' && item.note.trim().length > 0 ? item.note.trim() : null;
    accumulator.push({
      fieldName: formatFieldLabel(rawFieldName),
      note,
    });

    return accumulator;
  }, []);
};

const formatRejectionFieldItems = (items: RejectionFieldChangeItem[]): string => {
  if (items.length === 0) {
    return 'None';
  }

  return items
    .map(item => {
      if (!item.note) {
        return item.fieldName;
      }

      return `${item.fieldName} (Note: ${item.note})`;
    })
    .join(', ');
};

const isRecordValue = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toFieldLookupKey = (fieldName: string): string => {
  return fieldName.trim().replaceAll('_', '').toLowerCase();
};

const isDateField = (fieldName: string): boolean => {
  const normalized = fieldName.trim().toLowerCase();
  return normalized.endsWith('_at') || normalized.endsWith('at');
};

const isActorField = (fieldName: string): boolean => {
  const normalized = fieldName.trim().toLowerCase();
  return normalized.endsWith('_by') || normalized.endsWith('by');
};

const isImageChangeField = (fieldName: string): boolean => {
  return AUDIT_TIMELINE_IMAGE_CHANGE_FIELDS.has(toFieldLookupKey(fieldName));
};

const isAssigneeChangeField = (fieldName: string): boolean => {
  return AUDIT_TIMELINE_ASSIGNEE_CHANGE_FIELDS.has(toFieldLookupKey(fieldName));
};

const isIdListChangeField = (fieldName: string): boolean => {
  return AUDIT_TIMELINE_ID_LIST_CHANGE_FIELDS.has(toFieldLookupKey(fieldName));
};

const isResubmissionChangeField = (fieldName: string): boolean => {
  return AUDIT_TIMELINE_RESUBMISSION_CHANGE_FIELDS.has(toFieldLookupKey(fieldName));
};

const formatTokenLabel = (value: string): string => {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase());
};

const formatUserReference = (value: unknown): string | null => {
  if (!isRecordValue(value)) {
    return null;
  }

  const display = typeof value.display === 'string' && value.display.trim().length > 0 ? value.display.trim() : null;
  const email = typeof value.email === 'string' && value.email.trim().length > 0 ? value.email.trim() : null;
  const role = typeof value.role === 'string' && value.role.trim().length > 0 ? value.role.trim() : null;

  if (!display && !email) {
    return null;
  }

  const identity = display ?? email ?? 'Unknown';
  if (!role) {
    return identity;
  }

  return `${identity} (${formatTokenLabel(role)})`;
};

const getNumericIdFromUnknown = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsedNumber = Number(value);
    if (Number.isFinite(parsedNumber)) {
      return parsedNumber;
    }
  }

  return null;
};

const getImageIdFromItem = (item: unknown): number | null => {
  if (!isRecordValue(item)) {
    return null;
  }

  const directImageId = getNumericIdFromUnknown(item.image_id ?? item.imageId);
  if (directImageId !== null) {
    return directImageId;
  }

  const nestedImageId = isRecordValue(item.image) ? getNumericIdFromUnknown(item.image.id) : null;
  if (nestedImageId !== null) {
    return nestedImageId;
  }

  return getNumericIdFromUnknown(item.id);
};

const getImageUrlFromItem = (item: unknown): string | null => {
  if (!isRecordValue(item)) {
    return null;
  }

  if (typeof item.image_url === 'string' && item.image_url.trim().length > 0) {
    return item.image_url.trim();
  }

  if (typeof item.imageUrl === 'string' && item.imageUrl.trim().length > 0) {
    return item.imageUrl.trim();
  }

  if (typeof item.url === 'string' && item.url.trim().length > 0) {
    return item.url.trim();
  }

  if (isRecordValue(item.image)) {
    if (typeof item.image.image === 'string' && item.image.image.trim().length > 0) {
      return item.image.image.trim();
    }

    if (typeof item.image.url === 'string' && item.image.url.trim().length > 0) {
      return item.image.url.trim();
    }
  }

  return null;
};

const hasResponseText = (value: unknown): boolean => {
  return typeof value === 'string' && value.trim().length > 0;
};

const getResponsePreview = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const PREVIEW_LIMIT = 140;
  return normalizedValue.length > PREVIEW_LIMIT ? `${normalizedValue.slice(0, PREVIEW_LIMIT)}...` : normalizedValue;
};

const toResubmissionEntrySummaries = (value: unknown): ResubmissionEntrySummary[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<ResubmissionEntrySummary[]>((accumulator, entry) => {
    if (!isRecordValue(entry)) {
      return accumulator;
    }

    const requiredItemRaw =
      typeof entry.required_item === 'string' && entry.required_item.trim().length > 0
        ? entry.required_item.trim()
        : typeof entry.requiredItem === 'string' && entry.requiredItem.trim().length > 0
          ? entry.requiredItem.trim()
          : null;

    if (!requiredItemRaw) {
      return accumulator;
    }

    accumulator.push({
      requiredItemLabel: formatFieldLabel(requiredItemRaw),
      hasResponseText: hasResponseText(entry.response_text) || hasResponseText(entry.responseText),
      hasImage: getImageIdFromItem(entry) !== null,
      responsePreview: getResponsePreview(entry.response_text) ?? getResponsePreview(entry.responseText),
    });

    return accumulator;
  }, []);
};

const toResubmissionSummaries = (value: unknown): ResubmissionSummary[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<ResubmissionSummary[]>((accumulator, item) => {
    if (!isRecordValue(item)) {
      return accumulator;
    }

    const source =
      typeof item.source === 'string' && item.source.trim().length > 0 ? formatTokenLabel(item.source.trim()) : null;
    const note = typeof item.notes === 'string' && item.notes.trim().length > 0 ? item.notes.trim() : null;

    accumulator.push({
      id: getNumericIdFromUnknown(item.id),
      source,
      note,
      entries: toResubmissionEntrySummaries(item.entries),
    });

    return accumulator;
  }, []);
};

const isComplexDiffValue = (value: unknown): boolean => {
  return Array.isArray(value) || isRecordValue(value);
};

const formatRawValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'string') {
    return value.length > 0 ? value : '""';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '[Unserializable value]';
  }
};

const getComplexValueSummary = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? '' : 's'}`;
  }

  if (isRecordValue(value)) {
    const keyCount = Object.keys(value).length;
    return `${keyCount} field${keyCount === 1 ? '' : 's'}`;
  }

  return formatRawValue(value);
};

const getJsonPreview = (value: unknown): string => {
  const rawValue = formatRawValue(value);
  return rawValue.length > AUDIT_TIMELINE_JSON_PREVIEW_LIMIT
    ? `${rawValue.slice(0, AUDIT_TIMELINE_JSON_PREVIEW_LIMIT)}...`
    : rawValue;
};

const toNumericIdList = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<number[]>((accumulator, item) => {
    const numericId = getNumericIdFromUnknown(item);
    if (numericId !== null) {
      accumulator.push(numericId);
    }
    return accumulator;
  }, []);
};

const formatNumericIdListSummary = (values: number[]): string => {
  if (values.length === 0) {
    return 'None';
  }

  return `[${values.join(', ')}]`;
};

const toTimelineImagePreviewItems = (value: unknown): TimelineImagePreviewItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const previewMap = new Map<string, TimelineImagePreviewItem>();

  value.forEach((item, index) => {
    const imageUrl = getImageUrlFromItem(item);
    if (!imageUrl) {
      return;
    }

    const imageId = getImageIdFromItem(item);
    const normalizedId = imageId !== null ? String(imageId) : `image-${index + 1}`;
    const mapKey = `${normalizedId}-${imageUrl}`;

    if (!previewMap.has(mapKey)) {
      previewMap.set(mapKey, {
        id: normalizedId,
        url: imageUrl,
      });
    }
  });

  return Array.from(previewMap.values());
};

const formatImageIdsValue = (value: unknown): string => {
  if (value === null) {
    return 'No images';
  }

  if (!Array.isArray(value) || value.length === 0) {
    return 'No images';
  }

  const imageIds = value.reduce<number[]>((accumulator, item) => {
    const imageId = getImageIdFromItem(item);
    if (imageId !== null) {
      accumulator.push(imageId);
      return accumulator;
    }

    const numericValue = getNumericIdFromUnknown(item);
    if (numericValue !== null) {
      accumulator.push(numericValue);
    }

    return accumulator;
  }, []);

  if (imageIds.length > 0) {
    return `[${imageIds.join(', ')}]`;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '[Unserializable value]';
  }
};

const formatDateValue = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return formatDateTime(value);
};

const formatDiffValue = (fieldName: string, value: unknown): string => {
  if (value === null) {
    return '—';
  }

  if (value === undefined) {
    return '—';
  }

  if (typeof value === 'string') {
    if (isDateField(fieldName)) {
      const formattedDate = formatDateValue(value);
      if (formattedDate) {
        return formattedDate;
      }
    }

    return value.length > 0 ? value : '""';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (isAssigneeChangeField(fieldName)) {
    const formattedAssignee = formatUserReference(value);
    return formattedAssignee ?? '—';
  }

  if (isImageChangeField(fieldName)) {
    return formatImageIdsValue(value);
  }

  if (isActorField(fieldName)) {
    const formattedUserReference = formatUserReference(value);
    if (formattedUserReference) {
      return formattedUserReference;
    }
  }

  if (Array.isArray(value) || typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Unserializable value]';
    }
  }

  return String(value);
};

const getCompactValue = (fieldName: string, value: unknown): string => {
  const formattedValue = formatDiffValue(fieldName, value);
  return formattedValue.length > AUDIT_TIMELINE_LONG_TEXT_LIMIT
    ? `${formattedValue.slice(0, AUDIT_TIMELINE_LONG_TEXT_LIMIT)}...`
    : formattedValue;
};

const normalizeStateToken = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

const toChangeViewModel = (
  fieldName: string,
  beforeValue: unknown,
  afterValue: unknown,
  id: number
): AuditTimelineChangeViewModel => {
  const key = `${id}-${fieldName}`;
  const fieldLabel = formatFieldLabel(fieldName);

  if (isImageChangeField(fieldName)) {
    return {
      kind: 'image',
      key,
      fieldLabel,
      beforeSummary: formatImageIdsValue(beforeValue),
      afterSummary: formatImageIdsValue(afterValue),
      beforePreviewItems: toTimelineImagePreviewItems(beforeValue),
      afterPreviewItems: toTimelineImagePreviewItems(afterValue),
    };
  }

  if (isRejectionFieldsField(fieldName)) {
    const beforeItems = toRejectionFieldItems(beforeValue);
    const afterItems = toRejectionFieldItems(afterValue);
    const beforeSummary = formatRejectionFieldItems(beforeItems);
    const afterSummary = formatRejectionFieldItems(afterItems);

    return {
      kind: 'rejectionFields',
      key,
      fieldLabel,
      beforeSummary,
      afterSummary,
      compactBefore:
        beforeSummary.length > AUDIT_TIMELINE_LONG_TEXT_LIMIT
          ? `${beforeSummary.slice(0, AUDIT_TIMELINE_LONG_TEXT_LIMIT)}...`
          : beforeSummary,
      compactAfter:
        afterSummary.length > AUDIT_TIMELINE_LONG_TEXT_LIMIT
          ? `${afterSummary.slice(0, AUDIT_TIMELINE_LONG_TEXT_LIMIT)}...`
          : afterSummary,
    };
  }

  if (isIdListChangeField(fieldName)) {
    const beforeIds = toNumericIdList(beforeValue);
    const afterIds = toNumericIdList(afterValue);

    return {
      kind: 'idList',
      key,
      fieldLabel,
      beforeSummary: formatNumericIdListSummary(beforeIds),
      afterSummary: formatNumericIdListSummary(afterIds),
    };
  }

  if (isResubmissionChangeField(fieldName)) {
    const beforeSummaries = toResubmissionSummaries(beforeValue);
    const afterSummaries = toResubmissionSummaries(afterValue);
    const latestAfterSummary = afterSummaries[afterSummaries.length - 1] ?? null;

    return {
      kind: 'resubmission',
      key,
      fieldLabel,
      beforeSubmissionCount: beforeSummaries.length,
      afterSubmissionCount: afterSummaries.length,
      latestAfterSummary: latestAfterSummary
        ? {
            source: latestAfterSummary.source,
            note: latestAfterSummary.note,
            totalEntries: latestAfterSummary.entries.length,
            answeredEntries: latestAfterSummary.entries.filter(entry => entry.hasResponseText || entry.hasImage).length,
            entries: latestAfterSummary.entries,
          }
        : null,
    };
  }

  const shouldKeepArrowLayout =
    isActorField(fieldName) ||
    isAssigneeChangeField(fieldName) ||
    isDateField(fieldName) ||
    isRejectionFieldsField(fieldName);

  if (!shouldKeepArrowLayout && (isComplexDiffValue(beforeValue) || isComplexDiffValue(afterValue))) {
    return {
      kind: 'complex',
      key,
      fieldLabel,
      beforeSummary: getComplexValueSummary(beforeValue),
      afterSummary: getComplexValueSummary(afterValue),
      beforeRaw: formatRawValue(beforeValue),
      afterRaw: formatRawValue(afterValue),
      beforePreview: getJsonPreview(beforeValue),
      afterPreview: getJsonPreview(afterValue),
    };
  }

  return {
    kind: 'default',
    key,
    fieldLabel,
    fullBefore: formatDiffValue(fieldName, beforeValue),
    fullAfter: formatDiffValue(fieldName, afterValue),
    compactBefore: getCompactValue(fieldName, beforeValue),
    compactAfter: getCompactValue(fieldName, afterValue),
  };
};

const toStateTransitionViewModel = (
  stateChangeEntry: [string, { before: unknown; after: unknown }] | undefined
): AuditTimelineStateTransitionViewModel | null => {
  const beforeStateToken = normalizeStateToken(stateChangeEntry?.[1].before);
  const afterStateToken = normalizeStateToken(stateChangeEntry?.[1].after);

  if (!beforeStateToken || !afterStateToken) {
    return null;
  }

  return {
    beforeToken: beforeStateToken,
    afterToken: afterStateToken,
  };
};

const toTimelineItemViewModel = (item: AuditTimelineItem): AuditTimelineItemViewModel => {
  const changeEntries = item.changes
    ? Object.entries(item.changes).filter(([fieldName]) => !isImageChangeField(fieldName))
    : [];
  const stateChangeEntry = changeEntries.find(([fieldName]) => AUDIT_TIMELINE_STATE_CHANGE_FIELDS.has(fieldName));
  const detailChangeEntries = changeEntries.filter(([fieldName]) => !AUDIT_TIMELINE_STATE_CHANGE_FIELDS.has(fieldName));

  return {
    key: `${item.id}-${item.performedAt}`,
    eventType: item.eventType,
    user: item.user,
    actorEmail: item.actorEmail,
    action: item.action,
    performedAtLabel: formatDateTime(item.performedAt),
    registrationNumber: item.registrationNumber,
    updatedFields: item.updatedFields
      .filter(fieldName => !isImageChangeField(fieldName))
      .map(fieldName => ({ key: fieldName, label: formatFieldLabel(fieldName) })),
    stateTransition: toStateTransitionViewModel(stateChangeEntry),
    detailChanges: detailChangeEntries.map(([fieldName, change]) =>
      toChangeViewModel(fieldName, change.before, change.after, item.id)
    ),
  };
};

export const buildAuditTimelineItemViewModels = (items: AuditTimelineItem[]): AuditTimelineItemViewModel[] => {
  return items.map(toTimelineItemViewModel);
};

export const getStateLabel = (token: string): string => {
  if (token === 'QA_REVIEW') {
    return 'QA Review';
  }

  if (token === 'QA_APPROVED') {
    return 'QA Approved';
  }

  if (token === 'QA_REJECTED') {
    return 'QA Rejected';
  }

  if (token === 'IN_REVIEW') {
    return 'In Review';
  }

  if (token === 'RESUBMIT') {
    return 'Resubmission';
  }

  return token
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase());
};

export const getStateVariant = (token: string): StatusBadgeVariant => {
  if (token === 'APPROVED') {
    return 'approved';
  }

  if (token === 'QA_APPROVED') {
    return 'qaApproved';
  }

  if (token === 'REJECTED' || token === 'QA_REJECTED') {
    return 'rejected';
  }

  if (token === 'RESOLVED') {
    return 'resolved';
  }

  if (token === 'QA_REVIEW' || token === 'RESUBMIT') {
    return 'info';
  }

  if (token === 'IN_REVIEW' || token === 'SUBMITTED') {
    return 'pending';
  }

  return 'default';
};
