/**
 * Helper Functions - add implementations as needed.
 *
 * Each block below describes the intended helper function, its parameters,
 * return value, example usage, and complexity notes. Keep implementations
 * small, well-tested, and documented.
 */

/**
 * formatDate
 * - Purpose: Format a Date to a localized string or custom format.
 * - Params:
 *   - date: Date | string | number
 *   - options?: { locale?: string; timeZone?: string; options?: Intl.DateTimeFormatOptions }
 * - Returns: formatted string
 * - Example: formatDate(new Date(), { locale: 'en-US' })
 * - Complexity: O(1)
 */

import {
  COMPLAINT_SUBJECT_LABELS,
  DEFAULT_API_ERROR_MESSAGE,
  REGISTRATION_INVOICE_TYPES,
  REGISTRATION_PRODUCT_TYPES,
} from '#/constants';
import type {
  AuditLogApiDetailResponse,
  AuditLogApiListResponse,
  AuditLogDetail,
  AuditLogListResponse,
  AuditTimelineApiResponse,
  AuditTimelineResponse,
} from '#/types/auditLogs';
import type { ApiErrorShape } from '#/types/common/error.types';
import { COMPLAINT_API_STATUSES } from '#/types/complaints';
import type {
  ChatAttachment,
  ChatMessage,
  ComplaintApiMessage,
  ComplaintMessagesApiResponse,
  ComplaintApiStatus,
  ComplaintDetailApiResponse,
  ComplaintListApiResponse,
  ComplaintQueueSocketComplaint,
  ConversationListItem,
  ConversationListResponse,
  ConversationStatus,
  ConversationThread,
} from '#/types/complaints';
import type {
  ManualRegistrationApiResponse,
  ManualRegistrationSubmissionResult,
} from '#/types/manualRegistration/manualRegistration.types';
import type {
  RegistrationDetail,
  RegistrationDetailApiResponse,
  ResubmissionFieldName,
  RegistrationsListResponse,
} from '#/types/registrations/registration.types';
import type { Paginated } from '#/types/services.types';
import env from '#env';

const readErrorString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    const firstStringValue = value.find(item => typeof item === 'string' && item.trim().length > 0);
    return typeof firstStringValue === 'string' ? firstStringValue : undefined;
  }

  return undefined;
};

const formatComplaintSubject = (subject: string): string => {
  const normalizedSubject = subject.trim();
  const mappedSubject = COMPLAINT_SUBJECT_LABELS[normalizedSubject as keyof typeof COMPLAINT_SUBJECT_LABELS];

  if (mappedSubject) {
    return mappedSubject;
  }

  if (!normalizedSubject.includes('_')) {
    return normalizedSubject;
  }

  return normalizedSubject
    .toLowerCase()
    .split('_')
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const getApiErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') {
    return DEFAULT_API_ERROR_MESSAGE;
  }

  const typedError = error as ApiErrorShape;
  const responseData = typedError.response?.data;
  const canonicalMessage = readErrorString(responseData?.message) ?? readErrorString(responseData?.detail);

  if (canonicalMessage) {
    return canonicalMessage;
  }

  if (responseData && typeof responseData === 'object') {
    const preferredKeys = ['nonFieldErrors', 'non_field_errors', 'paintPair', 'paint_pair', 'registration'] as const;

    for (const key of preferredKeys) {
      const extractedMessage = readErrorString(responseData[key]);
      if (extractedMessage) {
        return extractedMessage;
      }
    }

    for (const value of Object.values(responseData)) {
      const extractedMessage = readErrorString(value);
      if (extractedMessage) {
        return extractedMessage;
      }
    }
  }

  return readErrorString(typedError.message) ?? typedError.message ?? DEFAULT_API_ERROR_MESSAGE;
};

export function getNextPageParamHelper<TData>(lastPage: TData, allPages: TData[], limit: number): number | undefined {
  if (Array.isArray(lastPage)) {
    return lastPage.length === limit ? allPages.length + 1 : undefined;
  }

  if (lastPage && typeof lastPage === 'object') {
    const pageObj = lastPage as Paginated;
    const data = pageObj.data ?? pageObj.items ?? pageObj.results;

    const hasNext =
      pageObj.hasNext !== undefined
        ? pageObj.hasNext
        : pageObj.total !== undefined
          ? allPages.length * limit < pageObj.total
          : Array.isArray(data) && data.length === limit;

    return hasNext ? allPages.length + 1 : undefined;
  }

  return undefined;
}

export const normalizeRegistrationsListResponse = (
  response: Partial<RegistrationsListResponse>
): RegistrationsListResponse => {
  return {
    count: response.count ?? response.results?.length ?? 0,
    next: response.next ?? null,
    previous: response.previous ?? null,
    results: response.results ?? [],
  };
};

export const normalizeRegistrationDetailResponse = (response: RegistrationDetailApiResponse): RegistrationDetail => {
  const supportedResubmissionFieldNames = new Set<ResubmissionFieldName>([
    'customer_name',
    'phone_number',
    'email',
    'city',
    'site_address',
    'purchase_date',
    'purchase_dealer',
    'purchase_dealer_city',
    'purchase_dealer_address',
    'postal_code',
    'paint_pairs',
    'paint_pair_invoices',
  ]);
  const normalizedPaintPairs = (response.paintPairs ?? response.paint_pairs ?? []).map(pair => {
    const topcoatId = pair.topcoat ?? pair.topcoatId ?? pair.topcoat_id ?? 0;
    const basecoatId = pair.basecoat ?? pair.basecoatId ?? pair.basecoat_id;
    const topcoatProductType =
      pair.topcoatProductType ?? pair.topcoat_product_type ?? REGISTRATION_PRODUCT_TYPES.TOPCOAT;

    return {
      id: pair.id ?? 0,
      topcoat: {
        id: topcoatId,
        name: pair.topcoatName ?? pair.topcoat_name ?? '',
        productType: topcoatProductType,
      },
      topcoatQuantity: pair.topcoatQuantity ?? pair.topcoat_quantity ?? '',
      basecoat:
        basecoatId === null || basecoatId === undefined
          ? null
          : {
              id: basecoatId,
              name: pair.basecoatName ?? pair.basecoat_name ?? '',
              productType: REGISTRATION_PRODUCT_TYPES.BASECOAT,
            },
      basecoatQuantity: pair.basecoatQuantity ?? pair.basecoat_quantity ?? null,
    };
  });

  const normalizedInvoices = (response.paintPairInvoices ?? response.paint_pair_invoices ?? []).map(invoice => {
    return {
      id: invoice.id ?? 0,
      image: {
        id: invoice.image?.id ?? 0,
        image: invoice.image?.image ?? '',
      },
      invoiceType: invoice.invoiceType ?? REGISTRATION_INVOICE_TYPES.TOPCOAT,
    };
  });
  const normalizedRejectionFields = (response.rejectionFields ?? response.rejection_fields ?? []).flatMap(field => {
    const fieldName = field.fieldName ?? field.field_name;
    if (!fieldName || !supportedResubmissionFieldNames.has(fieldName)) {
      return [];
    }

    return [
      {
        id: field.id ?? 0,
        fieldName,
        note: field.note ?? '',
        created: field.created ?? '',
      },
    ];
  });

  return {
    id: response.id ?? 0,
    registrationCode: response.registrationCode ?? response.registrationNumber ?? '',
    channel: response.channel ?? 'WEBFORM',
    state: response.state ?? 'SUBMITTED',
    customerName: response.customerName ?? '',
    phoneNumber: response.phoneNumber ?? '',
    email: response.email ?? '',
    city: response.city ?? '',
    siteAddress: response.siteAddress ?? '',
    purchaseDate: response.purchaseDate ?? '',
    purchaseDealer: response.purchaseDealer ?? '',
    purchaseDealerCity: response.purchaseDealerCity ?? '',
    purchaseDealerAddress: response.purchaseDealerAddress ?? '',
    postalCode: response.postalCode ?? '',
    notes: response.notes ?? '',
    approvedBy: response.approvedBy ?? null,
    approvedByEmail: response.approvedByEmail ?? null,
    approvedAt: response.approvedAt ?? null,
    warrantyCertificate: response.warrantyCertificate ?? null,
    paintPairs: normalizedPaintPairs,
    paintPairInvoices: normalizedInvoices,
    rejectionFields: normalizedRejectionFields,
    created: response.created ?? '',
    modified: response.modified ?? response.created ?? '',
  };
};

export const normalizeManualRegistrationCreateResponse = (
  response: ManualRegistrationApiResponse
): ManualRegistrationSubmissionResult => {
  const id = response.id ?? response.registration?.id ?? 0;
  const registrationCode =
    response.registrationCode ?? response.registration?.registrationCode ?? response.registrationNumber ?? '';

  return {
    id,
    registrationCode,
  };
};

const DEFAULT_SOCKET_SENDER = 'CS_AGENT';
const CUSTOMER_SENDER = 'CUSTOMER';
const SYSTEM_SENDER = 'SYSTEM';
const UNKNOWN_CITY = 'N/A';

const toAbsoluteBackendUrl = (urlValue: string): string => {
  if (urlValue.trim().length === 0) {
    return '';
  }

  try {
    return new URL(urlValue, env.VITE_BACKEND_BASE_URL).toString();
  } catch {
    if (urlValue.startsWith('/') && typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${urlValue}`;
    }

    return urlValue;
  }
};

const isRecordValue = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const toAttachmentIdString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const getAttachmentUrlFromRecord = (value: Record<string, unknown>): string | null => {
  const directUrl =
    toNonEmptyString(value.url) ??
    toNonEmptyString(value.imageUrl) ??
    toNonEmptyString(value.image_url) ??
    toNonEmptyString(value.file) ??
    toNonEmptyString(value.fileUrl) ??
    toNonEmptyString(value.file_url) ??
    toNonEmptyString(value.image);
  if (directUrl) {
    return toAbsoluteBackendUrl(directUrl);
  }

  if (isRecordValue(value.image)) {
    const nestedUrl = toNonEmptyString(value.image.url) ?? toNonEmptyString(value.image.image);
    if (nestedUrl) {
      return toAbsoluteBackendUrl(nestedUrl);
    }
  }

  return null;
};

const normalizeMessageAttachment = (value: unknown, fallbackId: string): ChatAttachment | null => {
  if (typeof value === 'string') {
    const normalizedUrl = toAbsoluteBackendUrl(value);
    if (normalizedUrl.length === 0) {
      return null;
    }

    return {
      id: fallbackId,
      name: `attachment-${fallbackId}`,
      url: normalizedUrl,
    };
  }

  if (!isRecordValue(value)) {
    return null;
  }

  const normalizedUrl = getAttachmentUrlFromRecord(value);
  if (!normalizedUrl) {
    return null;
  }

  const nestedImageObject = isRecordValue(value.image) ? value.image : null;
  const nestedImageId = nestedImageObject
    ? (toAttachmentIdString(nestedImageObject.id) ??
      toAttachmentIdString(nestedImageObject.imageId) ??
      toAttachmentIdString(nestedImageObject.image_id))
    : null;
  const normalizedId =
    toAttachmentIdString(value.id) ??
    toAttachmentIdString(value.imageId) ??
    toAttachmentIdString(value.image_id) ??
    nestedImageId ??
    fallbackId;

  const normalizedName =
    toNonEmptyString(value.name) ??
    toNonEmptyString(value.fileName) ??
    toNonEmptyString(value.file_name) ??
    toNonEmptyString(value.title) ??
    `attachment-${normalizedId}`;

  return {
    id: normalizedId,
    name: normalizedName,
    url: normalizedUrl,
  };
};

const getMessageAttachmentCandidates = (message: ComplaintApiMessage): unknown[] => {
  const candidates: unknown[] = [];

  const optionalArrays = [message.attachments, message.images];
  optionalArrays.forEach(arrayValue => {
    if (Array.isArray(arrayValue)) {
      candidates.push(...arrayValue);
    }
  });

  const optionalSingles = [
    message.image,
    message.attachment,
    message.file,
    message.media,
    message.photo,
    message.document,
  ];
  optionalSingles.forEach(item => {
    if (item !== undefined && item !== null) {
      candidates.push(item);
    }
  });

  return candidates;
};

const normalizeMessageAttachments = (message: ComplaintApiMessage): ChatAttachment[] => {
  const candidates = getMessageAttachmentCandidates(message);
  if (candidates.length === 0) {
    return [];
  }

  const normalizedAttachments = candidates.reduce<ChatAttachment[]>((attachments, candidate, index) => {
    const fallbackId = `${String(message.id)}-${index + 1}`;
    const normalizedAttachment = normalizeMessageAttachment(candidate, fallbackId);
    if (!normalizedAttachment) {
      return attachments;
    }

    const duplicateAttachment = attachments.some(
      attachment => attachment.id === normalizedAttachment.id && attachment.url === normalizedAttachment.url
    );
    if (!duplicateAttachment) {
      attachments.push(normalizedAttachment);
    }

    return attachments;
  }, []);

  return normalizedAttachments;
};

const mergeUniqueAttachments = (base: ChatAttachment[], next: ChatAttachment[]): ChatAttachment[] => {
  const mergedAttachments = [...base];

  next.forEach(attachment => {
    const alreadyPresent = mergedAttachments.some(
      existingAttachment => existingAttachment.id === attachment.id && existingAttachment.url === attachment.url
    );

    if (!alreadyPresent) {
      mergedAttachments.push(attachment);
    }
  });

  return mergedAttachments;
};

const getMessageKindFromSender = (sender?: string): ChatMessage['kind'] => {
  const normalizedSender = sender?.trim().toUpperCase();
  if (normalizedSender === CUSTOMER_SENDER) {
    return 'customer';
  }

  if (normalizedSender === SYSTEM_SENDER) {
    return 'system';
  }

  return 'agent';
};

const getSenderNameFromKind = (kind: ChatMessage['kind']): string => {
  if (kind === 'customer') {
    return 'Customer';
  }

  if (kind === 'system') {
    return 'System';
  }

  return 'CS Agent';
};

export const normalizeComplaintApiMessage = (response: ComplaintApiMessage, threadId: string): ChatMessage => {
  const kind = getMessageKindFromSender(response.sender ?? DEFAULT_SOCKET_SENDER);
  const createdAt = response.createdAt ?? response.created ?? new Date().toISOString();
  const normalizedAttachments = normalizeMessageAttachments(response);
  const rawText = typeof response.text === 'string' ? response.text.trim() : '';
  const normalizedText =
    rawText.length > 0 ? rawText : normalizedAttachments.length > 0 ? 'Image attachment' : 'Message';

  return {
    id: String(response.id),
    threadId,
    kind,
    senderName: getSenderNameFromKind(kind),
    text: normalizedText,
    createdAt,
    attachments: normalizedAttachments.length > 0 ? normalizedAttachments : undefined,
  };
};

export const normalizeComplaintMessagesResponse = (response: ComplaintMessagesApiResponse): ComplaintApiMessage[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if (isRecordValue(response) && Array.isArray(response.results)) {
    return response.results;
  }

  if (isRecordValue(response)) {
    const numericKeys = Object.keys(response).filter(key => /^\d+$/.test(key));
    if (numericKeys.length > 0) {
      return numericKeys
        .sort((left, right) => Number(left) - Number(right))
        .map(key => response[key])
        .filter((value): value is ComplaintApiMessage => isRecordValue(value));
    }
  }

  return [];
};

export const appendMessageToConversationThread = (
  previousThread: ConversationThread,
  message: ChatMessage
): ConversationThread => {
  const isDuplicateMessage = previousThread.messages.some(currentMessage => currentMessage.id === message.id);
  if (isDuplicateMessage) {
    return previousThread;
  }

  return {
    ...previousThread,
    messages: [...previousThread.messages, message],
    lastMessagePreview: message.text.trim().length > 0 ? message.text : 'Image attachment',
    lastMessageAt: message.createdAt,
  };
};

const mapComplaintApiStatusToConversationStatus = (status: ComplaintApiStatus): ConversationStatus => {
  if (status === COMPLAINT_API_STATUSES.RESOLVED || status === COMPLAINT_API_STATUSES.CLOSED) {
    return 'resolved';
  }

  return 'active';
};

const normalizeComplaintApiStatus = (status: unknown): ComplaintApiStatus => {
  const normalizedStatus = String(status ?? '')
    .trim()
    .toUpperCase();

  if (normalizedStatus === COMPLAINT_API_STATUSES.OPEN) {
    return COMPLAINT_API_STATUSES.OPEN;
  }

  if (normalizedStatus === COMPLAINT_API_STATUSES.IN_PROGRESS) {
    return COMPLAINT_API_STATUSES.IN_PROGRESS;
  }

  if (normalizedStatus === COMPLAINT_API_STATUSES.RESOLVED) {
    return COMPLAINT_API_STATUSES.RESOLVED;
  }

  if (normalizedStatus === COMPLAINT_API_STATUSES.CLOSED) {
    return COMPLAINT_API_STATUSES.CLOSED;
  }

  return COMPLAINT_API_STATUSES.OPEN;
};

const readQueueStringValue = (
  payload: ComplaintQueueSocketComplaint,
  camelKey: keyof ComplaintQueueSocketComplaint,
  snakeKey: keyof ComplaintQueueSocketComplaint
): string => {
  const camelValue = payload[camelKey];
  if (typeof camelValue === 'string' && camelValue.trim().length > 0) {
    return camelValue;
  }

  const snakeValue = payload[snakeKey];
  if (typeof snakeValue === 'string' && snakeValue.trim().length > 0) {
    return snakeValue;
  }

  return '';
};

const readQueueNullableStringValue = (
  payload: ComplaintQueueSocketComplaint,
  camelKey: keyof ComplaintQueueSocketComplaint,
  snakeKey: keyof ComplaintQueueSocketComplaint
): string | null => {
  const camelValue = payload[camelKey];
  if (camelValue === null) {
    return null;
  }
  if (typeof camelValue === 'string') {
    return camelValue;
  }

  const snakeValue = payload[snakeKey];
  if (snakeValue === null) {
    return null;
  }
  if (typeof snakeValue === 'string') {
    return snakeValue;
  }

  return null;
};

const readQueueNullableNumberValue = (
  payload: ComplaintQueueSocketComplaint,
  camelKey: keyof ComplaintQueueSocketComplaint,
  snakeKey: keyof ComplaintQueueSocketComplaint
): number | null => {
  const camelValue = payload[camelKey];
  if (camelValue === null) {
    return null;
  }
  if (typeof camelValue === 'number' && Number.isFinite(camelValue)) {
    return camelValue;
  }

  const snakeValue = payload[snakeKey];
  if (snakeValue === null) {
    return null;
  }
  if (typeof snakeValue === 'number' && Number.isFinite(snakeValue)) {
    return snakeValue;
  }

  return null;
};

const toConversationListItem = (item: ComplaintListApiResponse['results'][number]): ConversationListItem => {
  const apiStatus = normalizeComplaintApiStatus(item.status);
  const subjectLabel = formatComplaintSubject(item.subject);

  return {
    id: String(item.id),
    claimNumber: item.registrationNumber ?? String(item.id),
    customerName: item.customerName,
    customerPhone: item.phoneNumber,
    city: UNKNOWN_CITY,
    issueType: subjectLabel,
    apiStatus,
    status: mapComplaintApiStatusToConversationStatus(apiStatus),
    channel: 'whatsapp',
    unreadCount: 0,
    assignedToId: item.assignedTo ?? null,
    assignedAgent: item.assignedToEmail ?? undefined,
    lastMessagePreview: subjectLabel,
    lastMessageAt: item.created,
  };
};

export const normalizeComplaintQueueSocketItem = (payload: unknown): ConversationListItem | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const complaintPayload = payload as ComplaintQueueSocketComplaint;
  const rawId = complaintPayload.id;
  const conversationId = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : '';
  if (conversationId.length === 0) {
    return null;
  }

  const registrationNumber =
    readQueueNullableStringValue(complaintPayload, 'registrationNumber', 'registration_number') ?? conversationId;
  const customerName = readQueueStringValue(complaintPayload, 'customerName', 'customer_name');
  const customerPhone = readQueueStringValue(complaintPayload, 'phoneNumber', 'phone_number');
  const subject = readQueueStringValue(complaintPayload, 'subject', 'subject');
  const subjectLabel = subject ? formatComplaintSubject(subject) : '';
  const createdAt = readQueueStringValue(complaintPayload, 'created', 'created') || new Date().toISOString();
  const assignedToId = readQueueNullableNumberValue(complaintPayload, 'assignedTo', 'assigned_to');
  const assignedAgent = readQueueNullableStringValue(complaintPayload, 'assignedToEmail', 'assigned_to_email');
  const apiStatus = normalizeComplaintApiStatus(complaintPayload.status);

  return {
    id: conversationId,
    claimNumber: registrationNumber,
    customerName: customerName || customerPhone || 'Unknown Customer',
    customerPhone,
    city: UNKNOWN_CITY,
    issueType: subjectLabel || 'Complaint',
    apiStatus,
    status: mapComplaintApiStatusToConversationStatus(apiStatus),
    channel: 'whatsapp',
    unreadCount: 0,
    assignedToId,
    assignedAgent: assignedAgent ?? undefined,
    lastMessagePreview: subjectLabel || 'New complaint created',
    lastMessageAt: createdAt,
  };
};

export const normalizeComplaintsListResponse = (
  response: ComplaintListApiResponse,
  page: number,
  pageSize: number
): ConversationListResponse => {
  const items = response.results.map(toConversationListItem);

  return {
    items,
    total: response.count,
    page,
    pageSize,
    stats: {
      open: items.filter(item => item.apiStatus === COMPLAINT_API_STATUSES.OPEN).length,
      inProgress: items.filter(item => item.apiStatus === COMPLAINT_API_STATUSES.IN_PROGRESS).length,
      resolved: items.filter(item => item.apiStatus === COMPLAINT_API_STATUSES.RESOLVED).length,
      closed: items.filter(item => item.apiStatus === COMPLAINT_API_STATUSES.CLOSED).length,
    },
  };
};

export const normalizeComplaintDetailResponse = (
  response: ComplaintDetailApiResponse,
  responseMessages?: ComplaintApiMessage[]
): ConversationThread => {
  const threadId = String(response.id);
  const apiStatus = normalizeComplaintApiStatus(response.status);
  const fallbackTimestamp = new Date().toISOString();
  const submittedAt = response.created ?? response.modified ?? fallbackTimestamp;
  const resolvedRegistrationId =
    response.registrationNumber ??
    (typeof response.registration === 'number' ? String(response.registration) : undefined) ??
    threadId;
  const messageSource = responseMessages ?? response.messages ?? [];
  const subjectLabel = formatComplaintSubject(response.subject);
  const normalizedMessages = messageSource.map(message => normalizeComplaintApiMessage(message, threadId));
  const latestMessage = normalizedMessages.at(-1);
  const detailAttachments = (response.images ?? []).flatMap(imageItem => {
    const imageUrl = imageItem.image?.image;
    const imageId = imageItem.image?.id;

    if (!imageUrl || !imageId) {
      return [];
    }

    return [
      {
        id: String(imageId),
        name: `complaint-image-${imageId}`,
        url: toAbsoluteBackendUrl(imageUrl),
      },
    ];
  });
  const messageAttachments = normalizedMessages.reduce<ChatAttachment[]>((attachments, message) => {
    if (message.attachments && message.attachments.length > 0) {
      return mergeUniqueAttachments(attachments, message.attachments);
    }

    return attachments;
  }, []);
  const complaintImages = mergeUniqueAttachments(messageAttachments, detailAttachments);

  return {
    id: threadId,
    ticketId: threadId,
    claimNumber: response.registrationNumber ?? threadId,
    registrationId: resolvedRegistrationId,
    submittedAt,
    customerName: response.customerName,
    customerPhone: response.phoneNumber,
    description: response.description ?? '',
    closureNote: response.closureNote ?? '',
    closedAt: response.closedAt ?? null,
    city: UNKNOWN_CITY,
    issueType: subjectLabel,
    apiStatus,
    status: mapComplaintApiStatusToConversationStatus(apiStatus),
    channel: 'whatsapp',
    whatsappConnected: true,
    unreadCount: 0,
    assignedToId: response.assignedTo ?? null,
    assignedAgent: response.assignedToEmail ?? undefined,
    customerHistory: {
      registrations: 0,
      claims: 0,
      pastComplaints: 0,
    },
    complaintImages,
    lastMessagePreview: latestMessage?.text ?? subjectLabel,
    lastMessageAt: latestMessage?.createdAt ?? response.modified ?? response.created ?? submittedAt,
    lastResolvedAt: response.closedAt ?? undefined,
    messages: normalizedMessages,
  };
};

const AUDIT_LOG_ACTION_VALUES = ['CREATE', 'UPDATE', 'DELETE'] as const;

const isAuditLogAction = (value: unknown): value is AuditLogDetail['action'] => {
  return typeof value === 'string' && AUDIT_LOG_ACTION_VALUES.includes(value as AuditLogDetail['action']);
};

const normalizeAuditLogAction = (value: unknown): AuditLogDetail['action'] => {
  if (isAuditLogAction(value)) {
    return value;
  }

  return 'UPDATE';
};

const normalizeAuditLogListItem = (
  item: Partial<AuditLogApiListResponse['results'][number]>
): AuditLogListResponse['items'][number] => {
  const actorValue = typeof item.actor === 'number' && Number.isFinite(item.actor) ? item.actor : null;
  const objectId = item.objectId === undefined || item.objectId === null ? '' : String(item.objectId).trim();
  const objectRepr = typeof item.objectRepr === 'string' && item.objectRepr.trim().length > 0 ? item.objectRepr : 'N/A';
  const eventLabel =
    typeof item.eventLabel === 'string' && item.eventLabel.trim().length > 0 ? item.eventLabel : objectRepr;
  const registrationNumber =
    item.registrationNumber === undefined || item.registrationNumber === null
      ? null
      : String(item.registrationNumber).trim().length > 0
        ? String(item.registrationNumber).trim()
        : null;
  const created =
    typeof item.created === 'string' && item.created.trim().length > 0 ? item.created : new Date().toISOString();

  return {
    id: typeof item.id === 'number' && Number.isFinite(item.id) ? item.id : 0,
    actor: actorValue,
    actorEmail: typeof item.actorEmail === 'string' && item.actorEmail.trim().length > 0 ? item.actorEmail : 'Unknown',
    action: normalizeAuditLogAction(item.action),
    objectId: objectId.length > 0 ? objectId : 'unknown',
    objectRepr,
    eventLabel,
    registrationNumber,
    created,
  };
};

const normalizeAuditChanges = (changes: AuditLogApiDetailResponse['changes']): AuditLogDetail['changes'] => {
  if (!isRecordValue(changes)) {
    return null;
  }

  return Object.entries(changes).reduce<NonNullable<AuditLogDetail['changes']>>((accumulator, [key, value]) => {
    if (isRecordValue(value)) {
      accumulator[key] = {
        before: value.before,
        after: value.after,
      };
    }

    return accumulator;
  }, {});
};

export const normalizeAuditLogListResponse = (
  response: AuditLogApiListResponse,
  page: number,
  pageSize: number
): AuditLogListResponse => {
  return {
    total: typeof response.count === 'number' && Number.isFinite(response.count) ? response.count : 0,
    next: typeof response.next === 'string' ? response.next : null,
    previous: typeof response.previous === 'string' ? response.previous : null,
    page,
    pageSize,
    items: Array.isArray(response.results) ? response.results.map(item => normalizeAuditLogListItem(item)) : [],
  };
};

export const normalizeAuditLogDetailResponse = (response: AuditLogApiDetailResponse): AuditLogDetail => {
  const normalizedListItem = normalizeAuditLogListItem(response);

  return {
    ...normalizedListItem,
    changes: normalizeAuditChanges(response.changes),
    beforeData: isRecordValue(response.beforeData) ? response.beforeData : null,
    afterData: isRecordValue(response.afterData) ? response.afterData : null,
  };
};

const readStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(item => (typeof item === 'string' ? item.trim() : '')).filter(item => item.length > 0);
};

const normalizeAuditTimelineChanges = (value: unknown): Record<string, { before: unknown; after: unknown }> | null => {
  if (!isRecordValue(value)) {
    return null;
  }

  const normalizedEntries = Object.entries(value).reduce<Record<string, { before: unknown; after: unknown }>>(
    (accumulator, [fieldName, fieldValue]) => {
      if (!isRecordValue(fieldValue)) {
        return accumulator;
      }

      accumulator[fieldName] = {
        before: fieldValue.before,
        after: fieldValue.after,
      };

      return accumulator;
    },
    {}
  );

  return Object.keys(normalizedEntries).length > 0 ? normalizedEntries : null;
};

export const normalizeAuditTimelineResponse = (response: AuditTimelineApiResponse): AuditTimelineResponse => {
  const rawResults = Array.isArray(response.results) ? response.results : [];

  return {
    results: rawResults.map(item => {
      const typedItem = isRecordValue(item) ? item : {};
      const registrationNumber =
        typedItem.registration_number === undefined || typedItem.registration_number === null
          ? null
          : String(typedItem.registration_number).trim().length > 0
            ? String(typedItem.registration_number).trim()
            : null;
      const actorEmail =
        typeof typedItem.actor_email === 'string' && typedItem.actor_email.trim().length > 0
          ? typedItem.actor_email.trim()
          : typeof typedItem.actorEmail === 'string' && typedItem.actorEmail.trim().length > 0
            ? typedItem.actorEmail.trim()
            : 'Unknown';
      const user =
        typeof typedItem.user === 'string' && typedItem.user.trim().length > 0 ? typedItem.user.trim() : actorEmail;
      const eventType =
        typeof typedItem.event_type === 'string' && typedItem.event_type.trim().length > 0
          ? typedItem.event_type.trim()
          : 'Timeline event';
      const performedAt =
        typeof typedItem.performed_at === 'string' && typedItem.performed_at.trim().length > 0
          ? typedItem.performed_at
          : new Date().toISOString();

      return {
        id: typeof typedItem.id === 'number' && Number.isFinite(typedItem.id) ? typedItem.id : 0,
        user,
        actorEmail,
        action: normalizeAuditLogAction(typedItem.action),
        eventType,
        performedAt,
        updatedFields: readStringArray(typedItem.updated_fields),
        changes: normalizeAuditTimelineChanges(typedItem.changes),
        registrationNumber,
      };
    }),
  };
};
