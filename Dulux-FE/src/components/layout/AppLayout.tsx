import type { JSX } from 'react';

import { Outlet } from 'react-router-dom';

import { Header } from './Header';
import { PageWrapper } from './PageWrapper';
import { Sidebar } from './Sidebar';

/**
 * App shell for authenticated `/app/*` routes.
 */
export const AppLayout = (): JSX.Element => (
  <div className='flex h-screen overflow-hidden bg-page-canvas'>
    <Sidebar />
    <div className='flex min-w-0 flex-1 flex-col bg-page-body'>
      <Header />
      <PageWrapper>
        <Outlet />
      </PageWrapper>
    </div>
  </div>
);
