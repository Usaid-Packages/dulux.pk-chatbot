import type { JSX } from 'react';

import { Bell, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { HEADER_TITLE_MAP, ROUTES } from '#/constants';
import { useAuthContext } from '#/context';

const getHeaderTitle = (pathName: string): string => {
  const matchedHeader = HEADER_TITLE_MAP.find(item => pathName.startsWith(item.pathPrefix));
  return matchedHeader?.title ?? 'Dulux Assurance';
};

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

const getBreadcrumb = (pathName: string): string | null => {
  if (pathName.startsWith(ROUTES.MANUAL_REGISTRATION_ROOT)) {
    return '/ Manual Entry';
  }

  return null;
};

/**
 * Header renders top bar content for the app shell.
 *
 * @returns Header component.
 */
export const Header = (): JSX.Element => {
  const location = useLocation();
  const { user } = useAuthContext();
  const title = getHeaderTitle(location.pathname);
  const breadcrumb = getBreadcrumb(location.pathname);
  const userEmail = user?.email ?? 'user@dulux.pk';
  const roleLabel = toDisplayRole(user?.role);
  const initials = toInitials(user?.email);

  return (
    <header className='h-[56px] shrink-0 border-b border-border bg-surface px-6'>
      <div className='flex h-full items-center gap-4'>
        <div className='flex items-center gap-1'>
          <h2 className='text-base font-bold text-text-primary'>{title}</h2>
          {breadcrumb ? <p className='ml-1 text-xs text-text-muted'>{breadcrumb}</p> : null}
        </div>

        <div className='ml-auto flex items-center gap-3'>
          <button
            type='button'
            aria-label='Notifications'
            className='relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-strong bg-surface text-text-muted transition-colors hover:bg-page-canvas'
          >
            <Bell className='h-4 w-4' />
            <span className='absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-status-rejected-text' />
          </button>

          <button
            type='button'
            aria-label='Account menu'
            className='inline-flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-page-canvas'
          >
            <span className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white'>
              {initials}
            </span>
            <span className='min-w-0 text-left'>
              <span className='block truncate text-xs font-semibold text-text-secondary'>{userEmail}</span>
              <span className='block text-[10px] text-text-muted'>{roleLabel}</span>
            </span>
            <ChevronDown className='h-3.5 w-3.5 text-text-muted' aria-hidden='true' />
          </button>
        </div>
      </div>
    </header>
  );
};
