import type { JSX } from 'react';

import dashboardVisual from '#/assets/images/dulux-logo.png';
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
      <section className='relative overflow-hidden rounded-3xl border border-primary/15 bg-[linear-gradient(125deg,#0d4ea8_0%,#1f75d2_42%,#73bbff_100%)] px-6 py-7 text-white shadow-[0_24px_55px_rgba(20,82,170,0.34)] md:px-8 md:py-8'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.28),transparent_40%)]'
        />

        <div className='relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between'>
          <div className='max-w-[720px]'>
            <p className='text-xs font-semibold uppercase tracking-[2.2px] text-blue-100'>Dulux Operations</p>
            <h1 className='mt-2 text-3xl font-extrabold leading-tight tracking-tight md:text-[2.15rem]'>
              Command Center Dashboard
            </h1>
            <p className='mt-2 max-w-[620px] text-sm text-blue-50/90 md:text-base'>
              A sharper overview to monitor workload, jump into workflows, and keep quality response times consistent.
            </p>
            <p className='mt-3 text-xs font-semibold uppercase tracking-[1.8px] text-blue-100'>
              Live insights for your operations team
            </p>
          </div>

          <div className='relative hidden md:block'>
            <div className='absolute -inset-3 rounded-full bg-white/25 blur-2xl' />
            <img
              src={dashboardVisual}
              alt='Dulux dashboard visual'
              className='relative h-[150px] w-[190px] rounded-2xl border border-white/35 bg-white/10 p-3 backdrop-blur-xl'
            />
          </div>
        </div>
      </section>

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
