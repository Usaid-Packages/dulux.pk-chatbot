import type { JSX } from 'react';

import type { LucideIcon } from 'lucide-react';
import {
  Boxes,
  ClipboardList,
  FileUp,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import { Button } from '#/components/ui/Button';
import { ROUTES, SIDEBAR_NAV_ITEMS } from '#/constants';
import { useLogout } from '#/hooks';
import { cn } from '#/utils';

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  FlaskConical,
  MessageSquareText,
  Boxes,
  FileUp,
  Settings,
};

const SIDEBAR_GROUP_ORDER = ['Main', 'Warranty', 'Support', 'Admin'] as const;

/**
 * Sidebar renders primary app navigation links.
 *
 * @returns Sidebar component.
 */
export const Sidebar = (): JSX.Element => {
  const location = useLocation();
  const { handleLogout, isLogoutPending } = useLogout();
  const isManualRegistrationRoute = location.pathname.startsWith(ROUTES.MANUAL_REGISTRATION_ROOT);

  return (
    <aside className='flex w-[240px] shrink-0 flex-col overflow-y-auto border-r border-sidebar-borderColor bg-sidebar-bg'>
      <div className='flex items-center gap-[10px] border-b border-sidebar-borderColor px-5 pb-4 pt-5'>
        <div className='flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-white'>
          D
        </div>
        <div className='flex min-w-0 flex-col'>
          <h1 className='truncate text-sm font-bold text-white'>Dulux CS</h1>
          <p className='text-[10px] text-text-faint'>Warranty Ops</p>
        </div>
      </div>

      <nav aria-label='Primary navigation'>
        {SIDEBAR_GROUP_ORDER.map(group => {
          const groupItems = SIDEBAR_NAV_ITEMS.filter(item => item.group === group);

          if (groupItems.length === 0) {
            return null;
          }

          return (
            <div key={group}>
              <p className='nav-group-label'>{group}</p>
              {groupItems.map(item => {
                const Icon = NAV_ICON_MAP[item.icon];
                const isRegistrationsLink = item.path === ROUTES.REGISTRATIONS;
                const showActiveOnManualRegistration = isRegistrationsLink && isManualRegistrationRoute;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'app-sidebar-link-base',
                        isActive || showActiveOnManualRegistration
                          ? 'app-sidebar-link-active'
                          : 'app-sidebar-link-inactive'
                      )
                    }
                  >
                    <span className='flex h-[18px] w-[18px] items-center justify-center rounded-[4px] bg-white/10'>
                      <Icon className='h-3.5 w-3.5' aria-hidden='true' />
                    </span>
                    <span className='truncate'>{item.label}</span>
                    {item.badgeCount ? (
                      <span className='ml-auto rounded-full bg-sidebar-badge-bg px-[7px] py-[2px] text-[10px] font-semibold text-sidebar-badge-text'>
                        {item.badgeCount}
                      </span>
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className='mt-auto border-t border-sidebar-borderColor p-4'>
        <Button
          type='button'
          variant='ghost'
          className='w-full justify-start text-sidebar-navText hover:bg-sidebar-activeBg hover:text-white'
          onClick={handleLogout}
          disabled={isLogoutPending}
        >
          <LogOut className='h-4 w-4' aria-hidden='true' />
          {isLogoutPending ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
    </aside>
  );
};
