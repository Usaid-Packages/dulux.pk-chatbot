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
import { NavLink } from 'react-router-dom';

import { Button } from '#/components/ui/Button';
import { SIDEBAR_NAV_ITEMS } from '#/constants';
import { useAuthContext } from '#/context';
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

const toDisplayRole = (role: string | undefined): string => {
  if (!role) {
    return 'CS Agent';
  }

  const normalizedRole = role.replaceAll('_', ' ').toLowerCase();
  return normalizedRole.replace(/\b\w/g, character => character.toUpperCase());
};

const toInitials = (email: string | undefined): string => {
  if (!email) {
    return 'DU';
  }

  const firstToken = email.split('@')[0] ?? '';
  const letters = firstToken.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return letters.slice(0, 2) || 'DU';
};

/**
 * Sidebar renders primary app navigation links.
 *
 * @returns Sidebar component.
 */
export const Sidebar = (): JSX.Element => {
  const { user } = useAuthContext();
  const { handleLogout, isLogoutPending } = useLogout();
  const userEmail = user?.email ?? 'user@dulux.pk';
  const roleLabel = toDisplayRole(user?.role);
  const initials = toInitials(user?.email);

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

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn('app-sidebar-link-base', isActive ? 'app-sidebar-link-active' : 'app-sidebar-link-inactive')
                    }
                  >
                    <span className='flex h-[18px] w-[18px] items-center justify-center rounded-[4px] bg-white/10'>
                      <Icon className='h-3.5 w-3.5' aria-hidden='true' />
                    </span>
                    <span className='truncate'>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className='mt-auto border-t border-sidebar-borderColor p-4'>
        <div className='mb-3 flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-2'>
          <span className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white'>
            {initials}
          </span>
          <span className='min-w-0'>
            <span className='block truncate text-xs font-semibold text-sidebar-navText'>{userEmail}</span>
            <span className='block text-[10px] text-text-faint'>{roleLabel}</span>
          </span>
        </div>
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
