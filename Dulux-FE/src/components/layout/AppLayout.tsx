import type { JSX } from 'react';

import { Outlet } from 'react-router-dom';

import { Header } from './Header';
import { PageWrapper } from './PageWrapper';
import { Sidebar } from './Sidebar';

/**
 * App shell for authenticated `/app/*` routes.
 */
export const AppLayout = (): JSX.Element => (
  <div className='app-shell relative flex h-screen overflow-hidden bg-page-canvas'>
    <div aria-hidden='true' className='app-shell-orb app-shell-orb-left' />
    <div aria-hidden='true' className='app-shell-orb app-shell-orb-right' />

    <Sidebar />

    <div className='relative flex min-w-0 flex-1 flex-col'>
      <Header />
      <PageWrapper>
        <Outlet />
      </PageWrapper>
    </div>
  </div>
);
