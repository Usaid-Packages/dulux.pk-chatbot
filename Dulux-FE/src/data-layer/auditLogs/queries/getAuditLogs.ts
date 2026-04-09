import { GET, apiEndpoints } from '#/constants';
import { auditLogListResponseSchema } from '#/schemas/auditLogs.schema';
import { performRequest } from '#/services/apiClient';
import {
  AUDIT_LOG_DEFAULT_ORDERING,
  type AuditLogApiListResponse,
  type AuditLogListApiQuery,
  type AuditLogListFilters,
  type AuditLogListResponse,
} from '#/types/auditLogs';
import { normalizeAuditLogListResponse } from '#/utils';

const DEFAULT_FILTERS: AuditLogListFilters = {
  page: 1,
  pageSize: 10,
  action: 'all',
  actor: '',
  modelLabel: '',
  objectId: '',
  dateFrom: '',
  dateTo: '',
  search: '',
  ordering: AUDIT_LOG_DEFAULT_ORDERING,
};

export const getAuditLogs = async (params?: Partial<AuditLogListFilters>): Promise<AuditLogListResponse> => {
  const requestParams = { ...DEFAULT_FILTERS, ...params };

  const queryParams: AuditLogListApiQuery = {
    page: requestParams.page,
    pageSize: requestParams.pageSize,
    ordering: requestParams.ordering,
  };

  if (requestParams.action !== 'all') {
    queryParams.action = requestParams.action;
  }
  if (requestParams.actor.trim().length > 0) {
    queryParams.actor = requestParams.actor.trim();
  }
  if (requestParams.modelLabel.trim().length > 0) {
    queryParams.modelLabel = requestParams.modelLabel.trim();
  }
  if (requestParams.objectId.trim().length > 0) {
    queryParams.objectId = requestParams.objectId.trim();
  }
  if (requestParams.dateFrom.trim().length > 0) {
    queryParams.dateFrom = requestParams.dateFrom;
  }
  if (requestParams.dateTo.trim().length > 0) {
    queryParams.dateTo = requestParams.dateTo;
  }
  if (requestParams.search.trim().length > 0) {
    queryParams.search = requestParams.search.trim();
  }

  const response = await performRequest<AuditLogApiListResponse, undefined, AuditLogListApiQuery>({
    method: GET,
    url: apiEndpoints.auditLogs.list,
    params: queryParams,
  });

  return auditLogListResponseSchema.parse(
    normalizeAuditLogListResponse(response, requestParams.page, requestParams.pageSize)
  );
};
