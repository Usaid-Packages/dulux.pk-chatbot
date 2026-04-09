import { GET, apiEndpoints } from '#/constants';
import { auditLogDetailSchema } from '#/schemas/auditLogs.schema';
import { performRequest } from '#/services/apiClient';
import type { AuditLogApiDetailResponse, AuditLogDetail } from '#/types/auditLogs';
import { normalizeAuditLogDetailResponse } from '#/utils';

export const getAuditLogDetail = async (id: string): Promise<AuditLogDetail> => {
  const response = await performRequest<AuditLogApiDetailResponse>({
    method: GET,
    url: apiEndpoints.auditLogs.detail(id),
  });

  return auditLogDetailSchema.parse(normalizeAuditLogDetailResponse(response));
};
