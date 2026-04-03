import type { JSX } from 'react';

import { useLocation } from 'react-router-dom';

import { HEADER_TITLE_MAP } from '#/constants';

const getHeaderTitle = (pathName: string): string => {
  const matchedHeader = HEADER_TITLE_MAP.find(item => pathName.startsWith(item.pathPrefix));
  return matchedHeader?.title ?? 'Dulux Assurance';
};

/**
 * Header renders top bar content for the app shell.
 *
 * @returns Header component.
 */
export const Header = (): JSX.Element => {
  const location = useLocation();
  const title = getHeaderTitle(location.pathname);

  return (
    <header className='h-[56px] shrink-0 border-b border-border bg-surface px-6'>
      <div className='flex h-full items-center justify-between'>
        <h2 className='text-lg font-bold text-text-primary'>{title}</h2>
        <p className='text-sm text-text-muted'>Placeholder navigation shell</p>
      </div>
    </header>
  );
};
