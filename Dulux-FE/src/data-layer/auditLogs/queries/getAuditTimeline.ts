import { GET, apiEndpoints } from '#/constants';
import { auditTimelineResponseSchema } from '#/schemas/auditLogs.schema';
import { performRequest } from '#/services/apiClient';
import type { AuditTimelineApiResponse, AuditTimelineResponse, AuditTimelineTargetType } from '#/types/auditLogs';
import { normalizeAuditTimelineResponse } from '#/utils';

interface GetAuditTimelineParams extends Record<string, string> {
  type: AuditTimelineTargetType;
  object_id: string;
}

export const getAuditTimeline = async (
  type: AuditTimelineTargetType,
  objectId: string
): Promise<AuditTimelineResponse> => {
  const response = await performRequest<AuditTimelineApiResponse, undefined, GetAuditTimelineParams>({
    method: GET,
    url: apiEndpoints.auditLogs.timeline,
    params: {
      type,
      object_id: objectId,
    },
  });

  return auditTimelineResponseSchema.parse(normalizeAuditTimelineResponse(response));
};
