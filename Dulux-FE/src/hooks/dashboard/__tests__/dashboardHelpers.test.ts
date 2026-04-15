import { describe, expect, it } from 'vitest';

import { APP_USER_ROLES, DASHBOARD_SUMMARY_FALLBACK } from '#/constants';
import type { DashboardSummaryResponse } from '#/types/dashboard.types';
import { mapDashboardCards } from '../dashboardHelpers';

const createSummaryWithManualDraftStat = (): DashboardSummaryResponse => {
  return {
    ...DASHBOARD_SUMMARY_FALLBACK,
    flows: {
      ...DASHBOARD_SUMMARY_FALLBACK.flows,
      manualRegistration: {
        screens: 6,
        primaryStat: { label: 'Drafts', value: 9 },
        secondaryStat: { label: 'Submitted Today', value: 3 },
      },
    },
  };
};

describe('mapDashboardCards', () => {
  it('excludes quality review card for CS users', () => {
    const cards = mapDashboardCards(DASHBOARD_SUMMARY_FALLBACK, APP_USER_ROLES.CS);

    const hasQualityCard = cards.some(card => card.id === 'qualityReview');

    expect(hasQualityCard).toBe(false);
  });

  it('includes quality review card for quality users', () => {
    const cards = mapDashboardCards(DASHBOARD_SUMMARY_FALLBACK, APP_USER_ROLES.QUALITY);

    const hasQualityCard = cards.some(card => card.id === 'qualityReview');

    expect(hasQualityCard).toBe(true);
  });

  it('removes drafts stat from manual registration card stats', () => {
    const summary = createSummaryWithManualDraftStat();
    const cards = mapDashboardCards(summary, APP_USER_ROLES.ADMIN);
    const manualRegistrationCard = cards.find(card => card.id === 'manualRegistration');

    expect(manualRegistrationCard).toBeDefined();
    expect(manualRegistrationCard?.stats).toEqual([{ label: 'Submitted Today', value: 3 }]);
  });
});
