import type { JSX } from 'react';

import type { DashboardFlowCardModel } from '#/types/dashboard.types';
import { DashboardCard } from './DashboardCard';
import { DashboardGridSkeleton } from './DashboardGridSkeleton';

interface DashboardGridProps {
  flows: DashboardFlowCardModel[];
  isLoading: boolean;
}

/**
 * DashboardGrid renders all dashboard cards in a responsive grid.
 *
 * @param props - Flow list and loading state.
 * @returns Grid of dashboard cards.
 */
export const DashboardGrid = ({ flows, isLoading }: DashboardGridProps): JSX.Element => {
  if (isLoading) {
    return <DashboardGridSkeleton />;
  }

  if (flows.length === 0) {
    return (
      <section
        aria-live='polite'
        className='rounded-lg border border-dashed border-border bg-surface px-5 py-10 text-center text-text-muted'
      >
        No modules available yet.
      </section>
    );
  }

  const flowCards = flows.map(flow => <DashboardCard key={flow.id} flow={flow} />);

  return (
    <section aria-label='Dashboard modules' className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
      {flowCards}
    </section>
  );
};
