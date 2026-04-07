import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { DashboardWorkloadPoint } from '#/types/dashboard.types';

interface DashboardWorkloadChartProps {
  data: DashboardWorkloadPoint[];
}

/**
 * DashboardWorkloadChart renders a stacked workload split by module and state.
 *
 * @param props - Workload datapoints for the dashboard.
 * @returns Dashboard workload chart component.
 */
export const DashboardWorkloadChart = ({ data }: DashboardWorkloadChartProps): JSX.Element => {
  if (data.length === 0) {
    return (
      <section className='card'>
        <h3 className='card-title'>Queue Workload</h3>
        <p className='mt-2 text-sm text-text-muted'>No workload data available.</p>
      </section>
    );
  }

  return (
    <section className='card'>
      <h3 className='card-title'>Queue Workload Split</h3>
      <p className='mt-1 text-sm text-text-muted'>Pending, in-review, and resolved share by module.</p>

      <div className='mt-5 h-72 w-full rounded-lg border border-border bg-surface-subtle p-3'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 6 }}>
            <CartesianGrid stroke='var(--color-border)' strokeDasharray='3 3' />
            <XAxis dataKey='module' tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} />
            <Tooltip />
            <Bar dataKey='pending' name='Pending' stackId='queue' fill='var(--color-chart-4)' radius={[6, 6, 0, 0]} />
            <Bar
              dataKey='inReview'
              name='In Review'
              stackId='queue'
              fill='var(--color-chart-3)'
              radius={[6, 6, 0, 0]}
            />
            <Bar dataKey='resolved' name='Resolved' stackId='queue' fill='var(--color-chart-2)' radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='mt-4 flex flex-wrap gap-2 text-xs font-semibold text-text-muted'>
        <span className='rounded bg-surface-muted px-2 py-1'>Pending</span>
        <span className='rounded bg-surface-muted px-2 py-1'>In Review</span>
        <span className='rounded bg-surface-muted px-2 py-1'>Resolved</span>
      </div>
    </section>
  );
};
