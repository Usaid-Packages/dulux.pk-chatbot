import type { JSX } from 'react';

import dashboardVisual from '#/assets/images/dulux-logo.png';
import { DashboardGrid } from '#/components/dashboard';
import { Button } from '#/components/ui/Button';
import { useDashboard } from '#/hooks';

/**
 * DashboardPage renders the wireframe hub with module entry cards.
 *
 * @returns Dashboard page component.
 */
export const DashboardPage = (): JSX.Element => {
  const { flowCards, isLoading, isError, isRefetching, errorMessage, refetchDashboard } = useDashboard();

  return (
    <div className='mx-auto w-full max-w-[1280px] space-y-6'>
      <section className='space-y-1'>
        <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
          <div className='space-y-1'>
            <p className='text-sm font-semibold uppercase tracking-[1.6px] text-primary'>Dulux Assurance</p>
            <h1 className='text-3xl font-bold leading-tight text-text-primary md:text-[2rem]'>Dulux CS Dashboard</h1>
            <p className='text-base text-text-muted'>Track module progress and open any module directly from here.</p>
          </div>
          <img
            src={dashboardVisual}
            alt='Dulux dashboard visual'
            className='h-[215px] w-[287px] shrink-0 self-end object-contain md:self-center'
          />
        </div>
      </section>

      {isError && (
        <section
          role='alert'
          className='flex flex-col gap-3 rounded-lg border border-status-rejected-text/30 bg-status-rejected-bg px-4 py-3 md:flex-row md:items-center md:justify-between'
        >
          <div>
            <p className='text-sm font-semibold text-status-rejected-text'>Dashboard data could not be refreshed.</p>
            <p className='text-sm text-status-rejected-text/80'>{errorMessage}</p>
          </div>
          <Button variant='outline' onClick={refetchDashboard} disabled={isRefetching}>
            {isRefetching ? 'Retrying...' : 'Retry'}
          </Button>
        </section>
      )}

      <section className='space-y-1'>
        <h2 className='card-title'>Modules</h2>
        <p className='text-sm text-text-muted'>Each card includes module stats and links to the module page.</p>
      </section>

      <DashboardGrid flows={flowCards} isLoading={isLoading} />
    </div>
  );
};
