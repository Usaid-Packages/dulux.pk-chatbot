import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { DashboardTrendPoint } from '#/types/dashboard.types';

interface DashboardTrendChartProps {
  data: DashboardTrendPoint[];
}

/**
 * DashboardTrendChart renders a two-series weekly trend graph for registrations and claims.
 *
 * @param props - Trend datapoints for the dashboard.
 * @returns Dashboard trend chart component.
 */
export const DashboardTrendChart = ({ data }: DashboardTrendChartProps): JSX.Element => {
  if (data.length === 0) {
    return (
      <section className='card'>
        <h3 className='card-title'>Weekly Trend</h3>
        <p className='mt-2 text-sm text-text-muted'>No trend data available.</p>
      </section>
    );
  }

  const totalRegistrations = data.reduce((sum, point) => sum + point.registrations, 0);
  const totalClaims = data.reduce((sum, point) => sum + point.claims, 0);

  return (
    <section className='card'>
      <div>
        <h3 className='card-title'>Weekly Submissions Trend</h3>
        <p className='mt-1 text-sm text-text-muted'>Registrations vs claims created in the last 7 days.</p>
      </div>

      <div className='mt-4 overflow-hidden rounded-lg border border-border bg-surface-subtle p-3'>
        <div className='h-56 w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke='var(--color-border)' strokeDasharray='3 3' />
              <XAxis dataKey='day' tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} />
              <Tooltip />
              <Legend />
              <Line
                type='monotone'
                dataKey='registrations'
                name='Registrations'
                stroke='var(--color-dashboard-trend-registrations)'
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type='monotone'
                dataKey='claims'
                name='Claims'
                stroke='var(--color-dashboard-trend-claims)'
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className='mt-4 grid grid-cols-2 gap-3 text-sm'>
        <div className='rounded-md border border-border bg-surface-muted p-3'>
          <p className='font-semibold text-text-primary'>Registrations</p>
          <p className='mt-1 text-lg font-bold text-text-primary'>{totalRegistrations}</p>
        </div>
        <div className='rounded-md border border-border bg-surface-muted p-3'>
          <p className='font-semibold text-text-primary'>Claims</p>
          <p className='mt-1 text-lg font-bold text-text-primary'>{totalClaims}</p>
        </div>
      </div>
    </section>
  );
};
