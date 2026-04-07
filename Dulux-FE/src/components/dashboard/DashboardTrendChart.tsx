import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { DashboardTrendPoint } from '#/types/dashboard.types';

interface DashboardTrendChartProps {
  data: DashboardTrendPoint[];
}

interface TrendTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

interface TrendTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TrendTooltipPayloadItem[];
}

const TrendTooltipContent = ({ active, label, payload }: TrendTooltipProps): JSX.Element | null => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const registrationsValue = Number(payload.find(item => item.name === 'Registrations')?.value ?? 0);
  const claimsValue = Number(payload.find(item => item.name === 'Claims')?.value ?? 0);

  return (
    <div className='min-w-[180px] rounded-xl border border-primary/30 bg-white/95 p-3 shadow-[0_14px_30px_rgba(16,75,156,0.22)] backdrop-blur'>
      <p className='text-xs font-bold uppercase tracking-[1.4px] text-text-muted'>{label}</p>
      <div className='mt-2 space-y-1.5'>
        <p className='flex items-center justify-between gap-3 text-sm'>
          <span className='font-semibold text-[#1457b8]'>Registrations</span>
          <span className='font-extrabold text-text-primary'>{registrationsValue}</span>
        </p>
        <p className='flex items-center justify-between gap-3 text-sm'>
          <span className='font-semibold text-[#28a0f0]'>Claims</span>
          <span className='font-extrabold text-text-primary'>{claimsValue}</span>
        </p>
      </div>
      <p className='mt-2 border-t border-border/70 pt-2 text-xs font-semibold text-text-secondary'>
        Total: {registrationsValue + claimsValue}
      </p>
    </div>
  );
};

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
      </div>
      <p className='mt-1 text-sm text-text-muted'>Registrations vs claims created in the last 7 days.</p>

      <div className='relative mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(160deg,#fbfdff_0%,#e8f3ff_52%,#f5faff_100%)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]'>
        <div className='pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-300/35 blur-2xl' />
        <div className='pointer-events-none absolute -bottom-14 left-8 h-24 w-24 rounded-full bg-blue-300/30 blur-2xl' />

        <div className='mb-2 flex items-center gap-3 text-xs font-semibold'>
          <span className='inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[#1457b8]'>
            <span className='h-2 w-2 rounded-full bg-[#1457b8]' />
            Registrations
          </span>
          <span className='inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[#28a0f0]'>
            <span className='h-2 w-2 rounded-full bg-[#28a0f0]' />
            Claims
          </span>
        </div>

        <div className='h-56 w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id='registrationsFill' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='var(--color-dashboard-trend-registrations)' stopOpacity={0.3} />
                  <stop offset='100%' stopColor='var(--color-dashboard-trend-registrations)' stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id='claimsFill' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='var(--color-dashboard-trend-claims)' stopOpacity={0.28} />
                  <stop offset='100%' stopColor='var(--color-dashboard-trend-claims)' stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke='var(--color-border)' strokeDasharray='5 6' vertical={false} />
              <XAxis
                dataKey='day'
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TrendTooltipContent />} />
              <Area
                type='monotone'
                dataKey='registrations'
                name='Registrations'
                fill='url(#registrationsFill)'
                stroke='none'
                isAnimationActive={true}
                animationDuration={1200}
              />
              <Area
                type='monotone'
                dataKey='claims'
                name='Claims'
                fill='url(#claimsFill)'
                stroke='none'
                isAnimationActive={true}
                animationDuration={1400}
              />
              <Line
                type='monotone'
                dataKey='registrations'
                name='Registrations'
                stroke='var(--color-dashboard-trend-registrations)'
                strokeWidth={3}
                dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }}
                activeDot={{ r: 6, strokeWidth: 2, fill: '#ffffff' }}
                isAnimationActive={true}
                animationDuration={1200}
              />
              <Line
                type='monotone'
                dataKey='claims'
                name='Claims'
                stroke='var(--color-dashboard-trend-claims)'
                strokeWidth={3}
                dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }}
                activeDot={{ r: 6, strokeWidth: 2, fill: '#ffffff' }}
                isAnimationActive={true}
                animationDuration={1400}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className='mt-4 grid grid-cols-2 gap-3 text-sm'>
        <div className='rounded-xl border border-primary/15 bg-primary/5 p-3'>
          <p className='font-semibold text-text-primary'>Registrations</p>
          <p className='mt-1 text-lg font-bold text-text-primary'>{totalRegistrations}</p>
        </div>
        <div className='rounded-xl border border-primary/15 bg-primary/5 p-3'>
          <p className='font-semibold text-text-primary'>Claims</p>
          <p className='mt-1 text-lg font-bold text-text-primary'>{totalClaims}</p>
        </div>
      </div>
    </section>
  );
};
