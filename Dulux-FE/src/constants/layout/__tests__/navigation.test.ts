import { describe, expect, it } from 'vitest';

import { APP_USER_ROLES, ROUTES, SIDEBAR_NAV_ITEMS } from '#/constants';

describe('SIDEBAR_NAV_ITEMS', () => {
  it('shows the Quality Review tab only for quality users', () => {
    expect(SIDEBAR_NAV_ITEMS).toContainEqual(
      expect.objectContaining({
        label: 'Quality Review',
        path: ROUTES.QUALITY,
        allowedRoles: [APP_USER_ROLES.QUALITY],
      })
    );
  });
});
