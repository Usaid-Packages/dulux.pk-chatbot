import type { JSX } from 'react';

import { NavLink } from 'react-router-dom';

import { Button } from '#/components/ui/Button';
import { SIDEBAR_NAV_ITEMS } from '#/constants';
import { useLogout } from '#/hooks';
import { cn } from '#/utils';

/**
 * Sidebar renders primary app navigation links.
 *
 * @returns Sidebar component.
 */
export const Sidebar = (): JSX.Element => {
  const { handleLogout, isLogoutPending } = useLogout();

  return (
    <aside className='flex w-[240px] shrink-0 flex-col overflow-y-auto border-r border-sidebar-borderColor bg-sidebar-bg'>
      <div className='flex items-center gap-[10px] border-b border-sidebar-borderColor px-5 pb-4 pt-5'>
        <div className='flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-white'>
          DLX
        </div>
        <h1 className='text-md font-bold text-white'>Dulux Assurance</h1>
      </div>
      <nav aria-label='Primary navigation'>
        <p className='nav-group-label'>Overview</p>
        {SIDEBAR_NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn('app-sidebar-link-base', isActive ? 'app-sidebar-link-active' : 'app-sidebar-link-inactive')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className='mt-auto border-t border-sidebar-borderColor p-4'>
        <Button
          type='button'
          variant='ghost'
          className='w-full justify-start text-sidebar-navText hover:bg-sidebar-activeBg hover:text-white'
          onClick={handleLogout}
          disabled={isLogoutPending}
        >
          {isLogoutPending ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
    </aside>
  );
};
