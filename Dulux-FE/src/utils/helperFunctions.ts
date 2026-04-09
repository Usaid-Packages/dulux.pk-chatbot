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

import { DEFAULT_API_ERROR_MESSAGE } from '#/constants';
import type { ApiErrorShape } from '#/types/common/error.types';
import { COMPLAINT_API_STATUSES } from '#/types/complaints';
import type {
  ChatMessage,
  ComplaintApiMessage,
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
  const normalizedPaintPairs = (response.paintPairs ?? response.paint_pairs ?? []).map(pair => {
    const topcoatId = pair.topcoat ?? pair.topcoatId ?? pair.topcoat_id ?? 0;
    const basecoatId = pair.basecoat ?? pair.basecoatId ?? pair.basecoat_id;

    return {
      id: pair.id ?? 0,
      topcoat: {
        id: topcoatId,
        name: pair.topcoatName ?? pair.topcoat_name ?? '',
        productType: 'TOPCOAT',
      },
      topcoatQuantity: pair.topcoatQuantity ?? pair.topcoat_quantity ?? '',
      basecoat:
        basecoatId === null || basecoatId === undefined
          ? null
          : {
              id: basecoatId,
              name: pair.basecoatName ?? pair.basecoat_name ?? '',
              productType: 'BASECOAT',
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
      invoiceType: invoice.invoiceType ?? 'TOPCOAT',
    };
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
    province: response.province ?? '',
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
    return urlValue;
  }
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
  const normalizedText = response.text.trim();

  return {
    id: String(response.id),
    threadId,
    kind,
    senderName: getSenderNameFromKind(kind),
    text: normalizedText,
    createdAt,
  };
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
    lastMessagePreview: message.text,
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

  return {
    id: String(item.id),
    claimNumber: item.registrationNumber ?? String(item.id),
    customerName: item.customerName,
    customerPhone: item.phoneNumber,
    city: UNKNOWN_CITY,
    issueType: item.subject,
    apiStatus,
    status: mapComplaintApiStatusToConversationStatus(apiStatus),
    channel: 'whatsapp',
    unreadCount: 0,
    assignedToId: item.assignedTo ?? null,
    assignedAgent: item.assignedToEmail ?? undefined,
    lastMessagePreview: item.subject,
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
    issueType: subject || 'Complaint',
    apiStatus,
    status: mapComplaintApiStatusToConversationStatus(apiStatus),
    channel: 'whatsapp',
    unreadCount: 0,
    assignedToId,
    assignedAgent: assignedAgent ?? undefined,
    lastMessagePreview: subject || 'New complaint created',
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

export const normalizeComplaintDetailResponse = (response: ComplaintDetailApiResponse): ConversationThread => {
  const threadId = String(response.id);
  const apiStatus = normalizeComplaintApiStatus(response.status);
  const fallbackTimestamp = new Date().toISOString();
  const submittedAt = response.created ?? response.modified ?? fallbackTimestamp;
  const resolvedRegistrationId =
    response.registrationNumber ??
    (typeof response.registration === 'number' ? String(response.registration) : undefined) ??
    threadId;
  const normalizedMessages = (response.messages ?? []).map(message => normalizeComplaintApiMessage(message, threadId));
  const latestMessage = normalizedMessages.at(-1);
  const attachments = (response.images ?? []).flatMap(imageItem => {
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
    issueType: response.subject,
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
    complaintImages: attachments,
    lastMessagePreview: latestMessage?.text ?? response.subject,
    lastMessageAt: latestMessage?.createdAt ?? response.modified ?? response.created ?? submittedAt,
    lastResolvedAt: response.closedAt ?? undefined,
    messages: normalizedMessages.map(message => ({
      ...message,
      attachments: message === normalizedMessages[0] ? attachments : undefined,
    })),
  };
};
