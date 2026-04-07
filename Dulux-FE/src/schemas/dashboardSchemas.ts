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

const dashboardTrendPointSchema = z.object({
  day: z.string().min(1),
  registrations: z.number().int().nonnegative(),
  claims: z.number().int().nonnegative(),
});

const dashboardWorkloadPointSchema = z.object({
  module: z.string().min(1),
  pending: z.number().int().nonnegative(),
  inReview: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});

export const dashboardAnalyticsSchema = z.object({
  trendSeries: dashboardTrendPointSchema.array(),
  workloadSeries: dashboardWorkloadPointSchema.array(),
});
