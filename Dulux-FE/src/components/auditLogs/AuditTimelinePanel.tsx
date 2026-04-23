import type { JSX } from 'react';

import { Clock3, History, Mail, UserRound } from 'lucide-react';

import { Badge, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { useAuditTimeline } from '#/hooks/auditLogs';
import type { AuditTimelineItem, AuditTimelineTargetType } from '#/types/auditLogs';
import { cn, getApiErrorMessage } from '#/utils';

interface AuditTimelinePanelProps {
  type: AuditTimelineTargetType;
  objectId: string;
  title: string;
  subtitle: string;
  className?: string;
  maxItems?: number;
}

const ACTION_THEME_CLASS_BY_TYPE: Record<AuditTimelineItem['action'], string> = {
  CREATE: 'border-emerald-300/60 bg-emerald-100/80 text-emerald-800',
  UPDATE: 'border-sky-300/70 bg-sky-100/80 text-sky-800',
  DELETE: 'border-rose-300/70 bg-rose-100/80 text-rose-800',
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-PK', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const LONG_TEXT_LIMIT = 180;
const STATE_CHANGE_FIELDS = new Set(['state', 'workflow_state', 'workflowState', 'status']);
const IMAGE_CHANGE_FIELDS = new Set(['images', 'image_ids', 'imageids']);
const ASSIGNEE_CHANGE_FIELDS = new Set(['assigned_to', 'assignedto']);
const ID_LIST_CHANGE_FIELDS = new Set(['quality_review_ids', 'qualityreviewids']);
const RESUBMISSION_CHANGE_FIELDS = new Set(['resubmissions', 'resubmission']);
const INVOICE_ID_CHANGE_FIELDS = new Set([
  'invoice_ids',
  'invoiceids',
  'paint_pair_invoice_ids',
  'paintpairinvoiceids',
]);
const PAINT_PAIR_CHANGE_FIELDS = new Set(['paint_pairs', 'paintpairs']);
const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  approved_at: 'Approved at',
  approvedat: 'Approved at',
  approved_by: 'Approved by',
  approvedby: 'Approved by',
  rejection_fields: 'Rejected Fields',
  rejectionfields: 'Rejected Fields',
};
type StatusBadgeVariant = 'default' | 'pending' | 'approved' | 'qaApproved' | 'rejected' | 'info' | 'resolved';

const formatDateTime = (isoDateTime: string): string => {
  const parsedDate = new Date(isoDateTime);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Invalid timestamp';
  }

  return DATE_TIME_FORMATTER.format(parsedDate);
};

const formatFieldLabel = (fieldName: string): string => {
  const normalizedFieldName = fieldName.trim();
  const normalizedKey = normalizedFieldName.replaceAll('_', '').toLowerCase();
  const overrideLabel =
    FIELD_LABEL_OVERRIDES[normalizedKey] ?? FIELD_LABEL_OVERRIDES[normalizedFieldName.toLowerCase()];

  if (overrideLabel) {
    return overrideLabel;
  }

  return normalizedFieldName
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
};

interface RejectionFieldChangeItem {
  fieldName: string;
  note: string | null;
}

interface TimelineImagePreviewItem {
  id: string;
  url: string;
}

interface ResubmissionEntrySummary {
  requiredItemLabel: string;
  hasResponseText: boolean;
  hasImage: boolean;
  responsePreview: string | null;
}

interface ResubmissionSummary {
  id: number | null;
  source: string | null;
  note: string | null;
  entries: ResubmissionEntrySummary[];
}

interface PaintPairSummaryItem {
  id: number | null;
  topcoatId: number | null;
  basecoatId: number | null;
  topcoatName: string | null;
  basecoatName: string | null;
  topcoatQuantity: string | null;
  basecoatQuantity: string | null;
}

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
  return IMAGE_CHANGE_FIELDS.has(toFieldLookupKey(fieldName));
};

const isAssigneeChangeField = (fieldName: string): boolean => {
  return ASSIGNEE_CHANGE_FIELDS.has(toFieldLookupKey(fieldName));
};

const isIdListChangeField = (fieldName: string): boolean => {
  return ID_LIST_CHANGE_FIELDS.has(toFieldLookupKey(fieldName));
};

const isResubmissionChangeField = (fieldName: string): boolean => {
  return RESUBMISSION_CHANGE_FIELDS.has(toFieldLookupKey(fieldName));
};

const isInvoiceIdChangeField = (fieldName: string): boolean => {
  return INVOICE_ID_CHANGE_FIELDS.has(toFieldLookupKey(fieldName));
};

const isPaintPairChangeField = (fieldName: string): boolean => {
  return PAINT_PAIR_CHANGE_FIELDS.has(toFieldLookupKey(fieldName));
};

const formatTokenLabel = (value: string): string => {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase());
};

const formatRequiredItemLabel = (value: string): string => {
  return formatFieldLabel(value);
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
      requiredItemLabel: formatRequiredItemLabel(requiredItemRaw),
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

const formatPaintPairSummary = (value: unknown): string => {
  if (!Array.isArray(value) || value.length === 0) {
    return 'No pairs';
  }

  return `${value.length} pair${value.length === 1 ? '' : 's'}`;
};

const getNamedPaintProduct = (value: unknown): { id: number | null; name: string | null } => {
  if (!isRecordValue(value)) {
    return { id: null, name: null };
  }

  const name = typeof value.name === 'string' && value.name.trim().length > 0 ? value.name.trim() : null;

  return {
    id: getNumericIdFromUnknown(value.id),
    name,
  };
};

const toPaintPairSummaryItems = (value: unknown): PaintPairSummaryItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<PaintPairSummaryItem[]>((accumulator, item) => {
    if (!isRecordValue(item)) {
      return accumulator;
    }

    const topcoatProduct = getNamedPaintProduct(item.topcoat);
    const basecoatProduct = getNamedPaintProduct(item.basecoat);
    const topcoatName =
      typeof item.topcoat_name === 'string' && item.topcoat_name.trim().length > 0
        ? item.topcoat_name.trim()
        : typeof item.topcoatName === 'string' && item.topcoatName.trim().length > 0
          ? item.topcoatName.trim()
          : topcoatProduct.name;
    const basecoatName =
      typeof item.basecoat_name === 'string' && item.basecoat_name.trim().length > 0
        ? item.basecoat_name.trim()
        : typeof item.basecoatName === 'string' && item.basecoatName.trim().length > 0
          ? item.basecoatName.trim()
          : basecoatProduct.name;

    const topcoatQuantity =
      typeof item.topcoat_quantity === 'string' && item.topcoat_quantity.trim().length > 0
        ? item.topcoat_quantity.trim()
        : typeof item.topcoatQuantity === 'string' && item.topcoatQuantity.trim().length > 0
          ? item.topcoatQuantity.trim()
          : null;

    const basecoatQuantity =
      typeof item.basecoat_quantity === 'string' && item.basecoat_quantity.trim().length > 0
        ? item.basecoat_quantity.trim()
        : typeof item.basecoatQuantity === 'string' && item.basecoatQuantity.trim().length > 0
          ? item.basecoatQuantity.trim()
          : null;

    accumulator.push({
      id: getNumericIdFromUnknown(item.id),
      topcoatId: getNumericIdFromUnknown(item.topcoat_id ?? item.topcoatId ?? topcoatProduct.id),
      basecoatId: getNumericIdFromUnknown(item.basecoat_id ?? item.basecoatId ?? basecoatProduct.id),
      topcoatName,
      basecoatName,
      topcoatQuantity,
      basecoatQuantity,
    });

    return accumulator;
  }, []);
};

const formatPaintProductLabel = (name: string | null): string => {
  if (name) {
    return name;
  }

  return 'N/A';
};

const formatPaintPairItem = (item: PaintPairSummaryItem): string => {
  const pairIdPart = item.id !== null ? `Paint Pair #${item.id}` : 'Paint Pair';
  const topcoatPart = `Topcoat ${formatPaintProductLabel(item.topcoatName)} (Qty: ${item.topcoatQuantity ?? 'N/A'})`;
  const basecoatPart =
    item.basecoatId !== null || item.basecoatName !== null
      ? `Basecoat ${formatPaintProductLabel(item.basecoatName)} (Qty: ${item.basecoatQuantity ?? 'N/A'})`
      : 'Basecoat: None';

  return `${pairIdPart}: ${topcoatPart}, ${basecoatPart}`;
};

const formatPaintPairDetailSummary = (value: unknown): string => {
  const paintPairs = toPaintPairSummaryItems(value);
  if (paintPairs.length === 0) {
    return 'None';
  }

  const MAX_PAIRS_IN_SUMMARY = 2;
  const visiblePairs = paintPairs.slice(0, MAX_PAIRS_IN_SUMMARY).map(formatPaintPairItem);
  const remainingCount = paintPairs.length - visiblePairs.length;

  if (remainingCount <= 0) {
    return visiblePairs.join(' | ');
  }

  return `${visiblePairs.join(' | ')} | +${remainingCount} more`;
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
  return formattedValue.length > LONG_TEXT_LIMIT ? `${formattedValue.slice(0, LONG_TEXT_LIMIT)}...` : formattedValue;
};

const normalizeStateToken = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

const getStateLabel = (token: string): string => {
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

const getStateVariant = (token: string): StatusBadgeVariant => {
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

const renderImagePreviewRow = (heading: string, previewItems: TimelineImagePreviewItem[], key: string): JSX.Element => {
  if (previewItems.length === 0) {
    return (
      <div key={key} className='space-y-1'>
        <p className='text-[11px] font-semibold text-text-muted'>{heading}</p>
        <p className='text-xs text-text-muted'>No images</p>
      </div>
    );
  }

  return (
    <div key={key} className='space-y-1'>
      <p className='text-[11px] font-semibold text-text-muted'>{heading}</p>
      <div className='flex flex-wrap gap-2'>
        {previewItems.map(item => (
          <a
            key={`${key}-${item.id}-${item.url}`}
            href={item.url}
            target='_blank'
            rel='noreferrer'
            className='inline-flex'
            title={`Image ${item.id}`}
          >
            <img
              src={item.url}
              alt={`Image ${item.id}`}
              className='h-14 w-14 rounded-lg border border-primary/15 bg-surface-subtle object-cover'
              loading='lazy'
            />
          </a>
        ))}
      </div>
    </div>
  );
};

const renderComplexChange = (fieldName: string, beforeValue: unknown, afterValue: unknown, id: number): JSX.Element => {
  const beforeSummary = getComplexValueSummary(beforeValue);
  const afterSummary = getComplexValueSummary(afterValue);

  return (
    <div key={`${id}-${fieldName}`} className='space-y-1.5'>
      <p className='text-xs text-text-primary'>
        <span className='font-semibold text-text-muted'>{formatFieldLabel(fieldName)}:</span>{' '}
        <span className='font-medium'>{beforeSummary}</span>
        <span className='mx-1 text-primary'>{'\u2192'}</span>
        <span className='font-medium'>{afterSummary}</span>
      </p>
    </div>
  );
};

const renderIdListChange = (fieldName: string, beforeValue: unknown, afterValue: unknown, id: number): JSX.Element => {
  const beforeIds = toNumericIdList(beforeValue);
  const afterIds = toNumericIdList(afterValue);
  const beforeSummary = formatNumericIdListSummary(beforeIds);
  const afterSummary = formatNumericIdListSummary(afterIds);

  return (
    <div key={`${id}-${fieldName}`} className='space-y-1.5'>
      <p className='text-xs text-text-primary'>
        <span className='font-semibold text-text-muted'>{formatFieldLabel(fieldName)}:</span>{' '}
        <span>{beforeSummary}</span>
        <span className='mx-1 text-primary'>{'\u2192'}</span>
        <span>{afterSummary}</span>
      </p>
    </div>
  );
};

const renderResubmissionChange = (
  fieldName: string,
  beforeValue: unknown,
  afterValue: unknown,
  id: number
): JSX.Element => {
  const beforeSummaries = toResubmissionSummaries(beforeValue);
  const afterSummaries = toResubmissionSummaries(afterValue);
  const latestAfterSummary = afterSummaries[afterSummaries.length - 1] ?? null;
  const answeredEntriesCount =
    latestAfterSummary?.entries.filter(entry => entry.hasResponseText || entry.hasImage).length ?? 0;

  return (
    <div key={`${id}-${fieldName}`} className='space-y-2'>
      <p className='text-xs text-text-primary'>
        <span className='font-semibold text-text-muted'>{formatFieldLabel(fieldName)}:</span>{' '}
        <span className='font-medium'>
          {beforeSummaries.length} submission{beforeSummaries.length === 1 ? '' : 's'}
        </span>
        <span className='mx-1 text-primary'>{'\u2192'}</span>
        <span className='font-medium'>
          {afterSummaries.length} submission{afterSummaries.length === 1 ? '' : 's'}
        </span>
      </p>

      {latestAfterSummary ? (
        <div className='rounded-lg border border-primary/20 bg-primary/5 p-2 text-xs text-text-primary'>
          <p className='text-text-muted'>
            Source: {latestAfterSummary.source ?? 'Unknown'} | Requested items: {latestAfterSummary.entries.length} |
            Answered: {answeredEntriesCount}
          </p>
          {latestAfterSummary.entries.length > 0 ? (
            <div className='mt-2 space-y-2'>
              {latestAfterSummary.entries.map(entry => (
                <div
                  key={`${id}-${fieldName}-${entry.requiredItemLabel}-${entry.hasResponseText}-${entry.hasImage}-${entry.responsePreview ?? ''}`}
                  className='rounded-md border border-primary/15 bg-white p-2'
                >
                  <p className='text-[11px] font-semibold text-text-primary'>{entry.requiredItemLabel}</p>
                  <p className='mt-1 text-[11px] text-text-muted'>
                    Text: {entry.hasResponseText ? 'Provided' : 'Not provided'} | Image:{' '}
                    {entry.hasImage ? 'Attached' : 'Not attached'}
                  </p>
                  {entry.responsePreview ? (
                    <p className='mt-1 line-clamp-2 text-[11px] text-text-muted'>{entry.responsePreview}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {latestAfterSummary.note ? (
            <p className='mt-2 line-clamp-2 rounded-md border border-border/60 bg-white px-2 py-1 text-[11px] text-text-muted'>
              {latestAfterSummary.note}
            </p>
          ) : null}
        </div>
      ) : (
        <p className='text-xs text-text-muted'>No resubmission entries found.</p>
      )}
    </div>
  );
};

const renderArrowChange = (fieldName: string, beforeValue: unknown, afterValue: unknown, id: number): JSX.Element => {
  if (isInvoiceIdChangeField(fieldName)) {
    const beforeIds = toNumericIdList(beforeValue);
    const afterIds = toNumericIdList(afterValue);
    const beforeSummary = formatNumericIdListSummary(beforeIds);
    const afterSummary = formatNumericIdListSummary(afterIds);

    return (
      <div key={`${id}-${fieldName}`} className='space-y-1.5'>
        <p className='text-xs text-text-primary'>
          <span className='font-semibold text-text-muted'>{formatFieldLabel(fieldName)}:</span>{' '}
          <span>{beforeSummary}</span>
          <span className='mx-1 text-primary'>{'\u2192'}</span>
          <span>{afterSummary}</span>
        </p>
      </div>
    );
  }

  if (isPaintPairChangeField(fieldName)) {
    const beforeSummary = formatPaintPairSummary(beforeValue);
    const afterSummary = formatPaintPairSummary(afterValue);
    const beforeDetailSummary = formatPaintPairDetailSummary(beforeValue);
    const afterDetailSummary = formatPaintPairDetailSummary(afterValue);

    return (
      <div key={`${id}-${fieldName}`} className='space-y-1.5'>
        <p className='text-xs text-text-primary'>
          <span className='font-semibold text-text-muted'>{formatFieldLabel(fieldName)}:</span>{' '}
          <span>{beforeSummary}</span>
          <span className='mx-1 text-primary'>{'\u2192'}</span>
          <span>{afterSummary}</span>
        </p>
        <p className='text-[11px] text-text-primary'>
          <span title={beforeDetailSummary}>{beforeDetailSummary}</span>
          <span className='mx-1 text-primary'>{'\u2192'}</span>
          <span title={afterDetailSummary}>{afterDetailSummary}</span>
        </p>
      </div>
    );
  }

  if (isImageChangeField(fieldName)) {
    const beforeSummary = formatImageIdsValue(beforeValue);
    const afterSummary = formatImageIdsValue(afterValue);
    const beforePreviewItems = toTimelineImagePreviewItems(beforeValue);
    const afterPreviewItems = toTimelineImagePreviewItems(afterValue);

    return (
      <div key={`${id}-${fieldName}`} className='space-y-2'>
        <p className='text-xs text-text-primary'>
          <span className='font-semibold text-text-muted'>{formatFieldLabel(fieldName)}:</span>{' '}
          <span>{beforeSummary}</span>
          <span className='mx-1 text-primary'>{'\u2192'}</span>
          <span>{afterSummary}</span>
        </p>
        <div className='grid gap-3 sm:grid-cols-2'>
          {renderImagePreviewRow('Before', beforePreviewItems, `${id}-${fieldName}-before`)}
          {renderImagePreviewRow('After', afterPreviewItems, `${id}-${fieldName}-after`)}
        </div>
      </div>
    );
  }

  if (isRejectionFieldsField(fieldName)) {
    const beforeItems = toRejectionFieldItems(beforeValue);
    const afterItems = toRejectionFieldItems(afterValue);
    const beforeSummary = formatRejectionFieldItems(beforeItems);
    const afterSummary = formatRejectionFieldItems(afterItems);
    const compactBefore =
      beforeSummary.length > LONG_TEXT_LIMIT ? `${beforeSummary.slice(0, LONG_TEXT_LIMIT)}...` : beforeSummary;
    const compactAfter =
      afterSummary.length > LONG_TEXT_LIMIT ? `${afterSummary.slice(0, LONG_TEXT_LIMIT)}...` : afterSummary;

    return (
      <p key={`${id}-${fieldName}`} className='text-xs text-text-primary'>
        <span className='font-semibold text-text-muted'>{formatFieldLabel(fieldName)}:</span>{' '}
        <span title={beforeSummary}>{compactBefore}</span>
        <span className='mx-1 text-primary'>{'\u2192'}</span>
        <span title={afterSummary}>{compactAfter}</span>
      </p>
    );
  }

  if (isIdListChangeField(fieldName)) {
    return renderIdListChange(fieldName, beforeValue, afterValue, id);
  }

  if (isResubmissionChangeField(fieldName)) {
    return renderResubmissionChange(fieldName, beforeValue, afterValue, id);
  }

  const fullBefore = formatDiffValue(fieldName, beforeValue);
  const fullAfter = formatDiffValue(fieldName, afterValue);
  const compactBefore = getCompactValue(fieldName, beforeValue);
  const compactAfter = getCompactValue(fieldName, afterValue);
  const beforeStateToken = normalizeStateToken(beforeValue);
  const afterStateToken = normalizeStateToken(afterValue);
  const isStateChange = STATE_CHANGE_FIELDS.has(fieldName) && Boolean(beforeStateToken) && Boolean(afterStateToken);
  const shouldKeepArrowLayout =
    isActorField(fieldName) ||
    isAssigneeChangeField(fieldName) ||
    isDateField(fieldName) ||
    isRejectionFieldsField(fieldName);

  if (!shouldKeepArrowLayout && (isComplexDiffValue(beforeValue) || isComplexDiffValue(afterValue))) {
    return renderComplexChange(fieldName, beforeValue, afterValue, id);
  }

  return (
    <p key={`${id}-${fieldName}`} className='text-xs text-text-primary'>
      <span className='font-semibold text-text-muted'>{formatFieldLabel(fieldName)}:</span>
      {isStateChange ? (
        <span className='ml-1 inline-flex items-center gap-1.5 align-middle'>
          <Badge variant={getStateVariant(beforeStateToken ?? '')}>{getStateLabel(beforeStateToken ?? '')}</Badge>
          <span className='text-primary'>{'\u2192'}</span>
          <Badge variant={getStateVariant(afterStateToken ?? '')}>{getStateLabel(afterStateToken ?? '')}</Badge>
        </span>
      ) : (
        <>
          {' '}
          <span title={fullBefore}>{compactBefore}</span>
          <span className='mx-1 text-primary'>{'\u2192'}</span>
          <span title={fullAfter}>{compactAfter}</span>
        </>
      )}
    </p>
  );
};

/**
 * AuditTimelinePanel renders a compact admin-only timeline with readable field-level changes.
 *
 * @param props - Timeline target and panel labels.
 * @returns Left-column timeline card or null for non-admin roles.
 */
export const AuditTimelinePanel = ({
  type,
  objectId,
  title,
  subtitle,
  className,
  maxItems,
}: AuditTimelinePanelProps): JSX.Element | null => {
  const { isAdmin, timelineQuery } = useAuditTimeline(type, objectId);

  if (!isAdmin) {
    return null;
  }

  if (timelineQuery.isLoading) {
    return (
      <section className={cn('wf-card wf-card-p4 border-primary/15 bg-white/95', className)}>
        <Skeleton className='h-6 w-40' />
        <Skeleton className='mt-3 h-20 w-full' />
        <Skeleton className='mt-2 h-20 w-full' />
      </section>
    );
  }

  if (timelineQuery.isError) {
    return (
      <section className={cn('wf-card wf-card-p4 border-rose-300/60 bg-rose-50/60', className)}>
        <Empty>
          <EmptyContent>
            <EmptyHeader>
              <EmptyTitle>Unable to load timeline changes</EmptyTitle>
              <EmptyDescription>{getApiErrorMessage(timelineQuery.error)}</EmptyDescription>
            </EmptyHeader>
          </EmptyContent>
        </Empty>
      </section>
    );
  }

  const allTimelineItems = timelineQuery.data?.results ?? [];
  const timelineItems =
    typeof maxItems === 'number' && maxItems > 0
      ? allTimelineItems.slice(-maxItems).reverse()
      : [...allTimelineItems].reverse();

  return (
    <section
      className={cn(
        'wf-card wf-card-p4 border-primary/15 bg-[linear-gradient(165deg,#ffffff_0%,#f2f8ff_100%)]',
        className
      )}
    >
      <header className='rounded-2xl border border-primary/20 bg-white/80 p-3'>
        <div className='flex items-start gap-2'>
          <span className='rounded-xl bg-primary/10 p-1.5 text-primary'>
            <History className='h-4 w-4' />
          </span>
          <div>
            <h2 className='text-sm font-extrabold tracking-tight text-text-primary'>{title}</h2>
            <p className='text-xs text-text-muted'>{subtitle}</p>
          </div>
        </div>
      </header>

      {timelineItems.length === 0 ? (
        <article className='mt-3 rounded-xl border border-dashed border-primary/25 bg-white/90 p-3 text-xs text-text-muted'>
          No timeline changes recorded yet.
        </article>
      ) : (
        <div className='mt-3 max-h-[34rem] space-y-3 overflow-y-auto pr-1'>
          {timelineItems.map(item => {
            const changeEntries = item.changes
              ? Object.entries(item.changes).filter(([fieldName]) => !isImageChangeField(fieldName))
              : [];
            const stateChangeEntry = changeEntries.find(([fieldName]) => STATE_CHANGE_FIELDS.has(fieldName));
            const detailChangeEntries = changeEntries.filter(([fieldName]) => !STATE_CHANGE_FIELDS.has(fieldName));
            const beforeStateToken = normalizeStateToken(stateChangeEntry?.[1].before);
            const afterStateToken = normalizeStateToken(stateChangeEntry?.[1].after);
            const hasStateTransition = Boolean(beforeStateToken) && Boolean(afterStateToken);

            return (
              <article
                key={`${item.id}-${item.performedAt}`}
                className='rounded-xl border border-primary/15 bg-white/95 p-3 shadow-[0_6px_16px_rgba(19,87,167,0.08)]'
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0 space-y-1'>
                    <p className='text-sm font-semibold leading-5 text-text-primary'>{item.eventType}</p>
                    <p className='flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted'>
                      <UserRound className='h-3 w-3 shrink-0' />
                      <span className='truncate'>{item.user}</span>
                      <span className='inline-flex min-w-0 items-center gap-1 text-text-muted/90'>
                        <Mail className='h-3 w-3 shrink-0' />
                        <span className='truncate'>{item.actorEmail}</span>
                      </span>
                    </p>
                    <p className='flex items-center gap-1.5 text-[11px] text-text-muted'>
                      <Clock3 className='h-3 w-3 shrink-0' />
                      <span>
                        <span className='font-semibold text-text-muted'>Performed at:</span>{' '}
                        {formatDateTime(item.performedAt)}
                      </span>
                    </p>
                  </div>
                  <Badge className={cn('border text-[10px]', ACTION_THEME_CLASS_BY_TYPE[item.action])}>
                    {item.action}
                  </Badge>
                </div>

                {hasStateTransition ? (
                  <div className='mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface-muted/40 px-2 py-1 text-xs'>
                    <span className='font-semibold text-text-muted'>State:</span>
                    <Badge variant={getStateVariant(beforeStateToken ?? '')}>
                      {getStateLabel(beforeStateToken ?? '')}
                    </Badge>
                    <span className='text-primary'>{'\u2192'}</span>
                    <Badge variant={getStateVariant(afterStateToken ?? '')}>
                      {getStateLabel(afterStateToken ?? '')}
                    </Badge>
                  </div>
                ) : null}

                <div className='mt-3 space-y-2 rounded-xl bg-white'>
                  <div className='grid gap-1 text-[11px] text-text-muted md:grid-cols-2'>
                    {item.registrationNumber ? (
                      <p className='font-medium text-text-primary'>Reg #: {item.registrationNumber}</p>
                    ) : null}
                  </div>

                  {item.updatedFields.filter(fieldName => !isImageChangeField(fieldName)).length > 0 ? (
                    <div className='mt-2 flex flex-wrap gap-1'>
                      {item.updatedFields
                        .filter(fieldName => !isImageChangeField(fieldName))
                        .map(fieldName => (
                          <Badge
                            key={`${item.id}-${fieldName}`}
                            className='border border-primary/25 bg-primary/5 px-2 py-[2px] text-[10px] text-primary'
                          >
                            {formatFieldLabel(fieldName)}
                          </Badge>
                        ))}
                    </div>
                  ) : null}

                  {detailChangeEntries.length > 0 ? (
                    <div className='mt-2 space-y-2'>
                      {detailChangeEntries.map(([fieldName, change]) =>
                        renderArrowChange(fieldName, change.before, change.after, item.id)
                      )}
                    </div>
                  ) : hasStateTransition ? null : (
                    <p className='text-xs text-text-muted'>No field-level changes available.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
