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
  ScrollText,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import duluxLogo from '#/assets/images/dulux-logo.png';
import { Button } from '#/components/ui/Button';
import { SIDEBAR_NAV_ITEMS, normalizeAppUserRole } from '#/constants';
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
  ScrollText,
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
  const sidebarRole = normalizeAppUserRole(user?.role);
  const visibleNavItems = SIDEBAR_NAV_ITEMS.filter(
    item => sidebarRole !== null && item.allowedRoles.includes(sidebarRole)
  );

  return (
    <aside className='relative flex w-[272px] shrink-0 flex-col overflow-y-auto border-r border-sidebar-borderColor bg-sidebar-bg/95 backdrop-blur-2xl'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_8%,rgba(110,179,255,0.24),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]' />

      <div className='relative flex items-center gap-3 border-b border-sidebar-borderColor px-5 pb-5 pt-5'>
        <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-1 shadow-[0_10px_24px_rgba(2,12,36,0.28)]'>
          <img src={duluxLogo} alt='Dulux logo' className='h-full w-full rounded-xl object-contain' />
        </div>
        <div className='flex min-w-0 flex-col'>
          <h1 className='truncate text-base font-extrabold tracking-tight text-white'>Dulux CS</h1>
          <p className='text-[11px] text-blue-100/70'>Assurance Studio</p>
        </div>
      </div>

      <nav aria-label='Primary navigation' className='relative px-3 pb-2 pt-1'>
        {SIDEBAR_GROUP_ORDER.map(group => {
          const groupItems = visibleNavItems.filter(item => item.group === group);

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
                    <span className='flex h-[22px] w-[22px] items-center justify-center rounded-[7px] bg-white/12 text-blue-50'>
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

      <div className='relative mt-auto border-t border-sidebar-borderColor p-4'>
        <div className='mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-2.5'>
          <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-300 to-blue-500 text-xs font-bold text-slate-900'>
            {initials}
          </span>
          <span className='min-w-0'>
            <span className='block truncate text-xs font-semibold text-blue-50'>{userEmail}</span>
            <span className='block text-[10px] text-blue-100/60'>{roleLabel}</span>
          </span>
        </div>
        <Button
          type='button'
          variant='ghost'
          className='w-full justify-start border border-white/[0.15] bg-white/[0.07] text-blue-50 hover:bg-white/[0.15] hover:text-white'
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
