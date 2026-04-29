import type { JSX, ReactNode } from 'react';

import { cn } from '#/utils';

interface StatsCardItem {
  label: string;
  value: ReactNode;
  cardClassName?: string;
}

interface StatsCardGridProps {
  items: readonly StatsCardItem[];
  columns?: 3 | 4;
  className?: string;
}

/**
 * StatsCardGrid renders standardized stat cards used on list pages.
 *
 * @param props - Stat entries and grid options.
 * @returns Stats card grid.
 */
export const StatsCardGrid = ({ items, columns = 4, className }: StatsCardGridProps): JSX.Element => {
  return (
    <section className={cn(columns === 3 ? 'wf-stat-grid-3' : 'wf-stat-grid-4', className)}>
      {items.map(item => (
        <article key={item.label} className={cn('wf-stat-card border-primary/15 bg-white', item.cardClassName)}>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>{item.label}</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{item.value}</p>
        </article>
      ))}
    </section>
  );
};
