import type { JSX } from 'react';

import { NavLink } from 'react-router-dom';

import { SIDEBAR_NAV_ITEMS } from '#/constants';
import { cn } from '#/utils';

const getNavLinkClassName = ({ isActive }: { isActive: boolean }): string => {
  return cn('app-sidebar-link-base', isActive ? 'app-sidebar-link-active' : 'app-sidebar-link-inactive');
};

/**
 * Sidebar renders primary app navigation links.
 *
 * @returns Sidebar component.
 */
export const Sidebar = (): JSX.Element => {
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
          <NavLink key={item.path} to={item.path} className={getNavLinkClassName}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
