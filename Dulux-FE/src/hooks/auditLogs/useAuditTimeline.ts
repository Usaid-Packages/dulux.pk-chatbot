import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { APP_USER_ROLES, normalizeAppUserRole, queryKeys } from '#/constants';
import { useAuthContext } from '#/context';
import { getAuditTimeline } from '#/data-layer/auditLogs';
import type { AuditTimelineResponse, AuditTimelineTargetType } from '#/types/auditLogs';

interface UseAuditTimelineResult {
  isAdmin: boolean;
  timelineQuery: UseQueryResult<AuditTimelineResponse, Error>;
}

const AUDIT_ID_PATTERN = /^\d+$/;

/**
 * useAuditTimeline loads the admin-only timeline for a specific domain object.
 *
 * @param type - Timeline object type expected by the audit API.
 * @param objectId - Domain object id from route/detail context.
 * @returns Role guard flag and query state for timeline rendering.
 */
export const useAuditTimeline = (type: AuditTimelineTargetType, objectId: string): UseAuditTimelineResult => {
  const { user } = useAuthContext();

  const isAdmin = normalizeAppUserRole(user?.role) === APP_USER_ROLES.ADMIN;
  const normalizedObjectId = objectId.trim();
  const isValidObjectId = AUDIT_ID_PATTERN.test(normalizedObjectId) && Number(normalizedObjectId) > 0;
  const enabled = isAdmin && isValidObjectId;

  const queryKey = useMemo(() => queryKeys.auditLogs.timeline(type, normalizedObjectId), [type, normalizedObjectId]);

  const timelineQuery = useQuery<AuditTimelineResponse, Error>({
    queryKey,
    queryFn: () => getAuditTimeline(type, normalizedObjectId),
    enabled,
  });

  return {
    isAdmin,
    timelineQuery,
  };
};
