import type { JSX } from 'react';

import { useLocation } from 'react-router-dom';

import { HEADER_TITLE_MAP, ROUTES } from '#/constants';

const getHeaderTitle = (pathName: string): string => {
  const matchedHeader = HEADER_TITLE_MAP.find(item => pathName.startsWith(item.pathPrefix));
  return matchedHeader?.title ?? 'Dulux Assurance';
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
  const title = getHeaderTitle(location.pathname);
  const breadcrumb = getBreadcrumb(location.pathname);

  return (
    <header className='h-[56px] shrink-0 border-b border-border bg-surface px-6'>
      <div className='flex h-full items-center gap-4'>
        <div className='flex items-center gap-1'>
          <h2 className='text-base font-bold text-text-primary'>{title}</h2>
          {breadcrumb ? <p className='ml-1 text-xs text-text-muted'>{breadcrumb}</p> : null}
        </div>
      </div>
    </header>
  );
};
