import type { JSX } from 'react';

import { Sparkles } from 'lucide-react';
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
    <header className='relative shrink-0 border-b border-border/60 bg-white/75 px-4 backdrop-blur-xl md:h-[74px] md:px-6'>
      <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(92deg,rgba(30,102,214,0.09),rgba(103,174,255,0)_48%)]' />
      <div className='relative flex h-full items-center justify-between gap-4 py-3 md:py-0'>
        <div className='flex min-w-0 flex-col'>
          <div className='flex min-w-0 items-center gap-2'>
            <h2 className='truncate text-lg font-extrabold tracking-tight text-text-primary'>{title}</h2>
            {breadcrumb ? <p className='truncate text-xs font-semibold text-text-muted'>{breadcrumb}</p> : null}
          </div>
          <p className='text-xs text-text-muted md:text-sm'>
            Modern operations cockpit for registration and claims workflows.
          </p>
        </div>

        <span className='hidden items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary lg:inline-flex'>
          <Sparkles className='h-3.5 w-3.5' aria-hidden='true' />
          Live Overview
        </span>
      </div>
    </header>
  );
};
