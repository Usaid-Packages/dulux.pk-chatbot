import { describe, expect, it } from 'vitest';

import { APP_USER_ROLES, ROUTES, SIDEBAR_NAV_ITEMS } from '#/constants';

describe('SIDEBAR_NAV_ITEMS', () => {
  it('shows the Quality Review tab for admin and quality roles', () => {
    expect(SIDEBAR_NAV_ITEMS).toContainEqual(
      expect.objectContaining({
        label: 'Quality Review',
        path: ROUTES.QUALITY,
        allowedRoles: expect.arrayContaining([APP_USER_ROLES.ADMIN, APP_USER_ROLES.QUALITY]),
      })
    );
  });
});
