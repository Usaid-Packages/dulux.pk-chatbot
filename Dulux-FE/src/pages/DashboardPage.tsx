import type { JSX } from 'react';

import { DashboardGrid, DashboardTrendChart, DashboardWorkloadChart } from '#/components/dashboard';
import { useDashboard } from '#/hooks';

/**
 * DashboardPage renders the wireframe hub with module entry cards.
 *
 * @returns Dashboard page component.
 */
export const DashboardPage = (): JSX.Element => {
  const { flowCards, analytics, isLoading, isError, errorMessage } = useDashboard();

  return (
    <div className='mx-auto w-full max-w-[1320px] space-y-6'>
      {isError && (
        <section
          role='alert'
          className='rounded-2xl border border-status-rejected-text/30 bg-status-rejected-bg px-4 py-3'
        >
          <div>
            <p className='text-sm font-semibold text-status-rejected-text'>Dashboard data could not be refreshed.</p>
            <p className='text-sm text-status-rejected-text/80'>{errorMessage}</p>
          </div>
        </section>
      )}

      <section className='space-y-1'>
        <div className='space-y-1'>
          <h2 className='card-title'>Operational Overview</h2>
          <p className='text-sm text-text-muted'>Open a workflow area instantly and review its latest queue stats.</p>
        </div>
      </section>

      <DashboardGrid flows={flowCards} isLoading={isLoading} />

      <section className='space-y-1 pt-2'>
        <h2 className='card-title'>Performance Insights</h2>
        <p className='text-sm text-text-muted'>Quick visual trends to monitor submission and queue movement.</p>
      </section>

      <section className='grid gap-4 lg:grid-cols-2'>
        <DashboardTrendChart data={analytics.trendSeries} />
        <DashboardWorkloadChart data={analytics.workloadSeries} />
      </section>
    </div>
  );
};
