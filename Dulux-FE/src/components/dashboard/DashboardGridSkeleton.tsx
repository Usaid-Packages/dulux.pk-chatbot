import type { JSX } from 'react';

/**
 * DashboardGridSkeleton renders loading placeholders for dashboard cards.
 *
 * @returns Dashboard grid skeleton state.
 */
export const DashboardGridSkeleton = (): JSX.Element => {
  return (
    <section aria-label='Dashboard modules' className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
      <div className='h-[290px] animate-pulse rounded-lg border border-border bg-surface-muted' />
      <div className='h-[290px] animate-pulse rounded-lg border border-border bg-surface-muted' />
      <div className='h-[290px] animate-pulse rounded-lg border border-border bg-surface-muted' />
      <div className='h-[290px] animate-pulse rounded-lg border border-border bg-surface-muted' />
      <div className='h-[290px] animate-pulse rounded-lg border border-border bg-surface-muted' />
      <div className='h-[290px] animate-pulse rounded-lg border border-border bg-surface-muted' />
    </section>
  );
};
