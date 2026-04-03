import { z } from 'zod';

const dashboardStatItemSchema = z.object({
  label: z.string().min(1),
  value: z.union([z.string(), z.number()]),
});

const dashboardFlowStatsSchema = z.object({
  screens: z.number().int().nonnegative(),
  primaryStat: dashboardStatItemSchema,
  secondaryStat: dashboardStatItemSchema,
});

export const dashboardSummarySchema = z.object({
  flows: z.object({
    registrationApprovals: dashboardFlowStatsSchema,
    manualRegistration: dashboardFlowStatsSchema,
    claimsApprovals: dashboardFlowStatsSchema,
    qualityReview: dashboardFlowStatsSchema,
    liveChat: dashboardFlowStatsSchema,
    productCatalog: dashboardFlowStatsSchema,
  }),
});
