import type { JSX } from 'react';

import { Link } from 'react-router-dom';

import { DASHBOARD_ICON_MAP } from '#/constants';
import type { DashboardFlowCardModel } from '#/types/dashboard.types';

interface DashboardCardProps {
  flow: DashboardFlowCardModel;
}

/**
 * DashboardCard renders a module summary card linking to its route.
 *
 * @param props - Flow card details.
 * @returns Clickable dashboard card.
 */
export const DashboardCard = ({ flow }: DashboardCardProps): JSX.Element => {
  const { title, description, stats, to, icon } = flow;
  const Icon = DASHBOARD_ICON_MAP[icon];
  const statGridClassName = stats.length === 1 ? 'mt-5 grid grid-cols-1 gap-3' : 'mt-5 grid grid-cols-2 gap-3';
  const statItems = stats.map(stat => (
    <div key={`${flow.id}-${stat.label}`} className='dashboard-flow-stat-box'>
      <p className='stat-label'>{stat.label}</p>
      <p className='mt-1 text-2xl font-extrabold tracking-tight text-text-primary'>{stat.value}</p>
    </div>
  ));

  return (
    <article className='h-full'>
      <Link
        to={to}
        aria-label={`Open ${title}`}
        className='dashboard-flow-card group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <div className='flex items-start justify-between gap-3'>
          <span className='dashboard-flow-icon'>
            <Icon aria-hidden='true' className='h-5 w-5' />
          </span>
        </div>

        <div className='mt-4'>
          <h3 className='card-title'>{title}</h3>
          <p className='mt-1 text-sm text-text-muted'>{description}</p>
        </div>

        <div className={statGridClassName}>{statItems}</div>
      </Link>
    </article>
  );
};
