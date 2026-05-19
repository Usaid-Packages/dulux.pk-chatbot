import { describe, expect, it } from 'vitest';

import { APP_USER_ROLES, ROUTES, SIDEBAR_NAV_ITEMS } from '#/constants';

describe('SIDEBAR_NAV_ITEMS', () => {
  it('shows the Quality Review tab only for quality users', () => {
    const qualityNavItem = SIDEBAR_NAV_ITEMS.find(item => item.path === ROUTES.QUALITY);

    expect(qualityNavItem).toEqual(
      expect.objectContaining({
        label: 'Quality Review',
        path: ROUTES.QUALITY,
        allowedRoles: [APP_USER_ROLES.QUALITY],
      })
    );
    expect(qualityNavItem?.allowedRoles).not.toContain(APP_USER_ROLES.ADMIN);
  });
});
