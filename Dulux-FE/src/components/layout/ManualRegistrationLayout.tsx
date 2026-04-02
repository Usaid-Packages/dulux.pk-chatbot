import type { JSX } from 'react';

import { Outlet } from 'react-router-dom';

/**
 * Layout wrapper for the manual registration wizard (step routes + success).
 */
export const ManualRegistrationLayout = (): JSX.Element => {
  return (
    <div className='p-6'>
      <Outlet />
    </div>
  );
};
