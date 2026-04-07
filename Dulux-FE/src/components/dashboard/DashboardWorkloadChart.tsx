import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { DashboardWorkloadPoint } from '#/types/dashboard.types';

interface DashboardWorkloadChartProps {
  data: DashboardWorkloadPoint[];
}

interface WorkloadTooltipPayloadItem {
  name?: string;
  value?: number | string;
}

interface WorkloadTooltipProps {
  active?: boolean;
  label?: string;
  payload?: WorkloadTooltipPayloadItem[];
}

const WorkloadTooltipContent = ({ active, label, payload }: WorkloadTooltipProps): JSX.Element | null => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const pendingValue = Number(payload.find(item => item.name === 'Pending')?.value ?? 0);
  const reviewValue = Number(payload.find(item => item.name === 'In Review')?.value ?? 0);
  const resolvedValue = Number(payload.find(item => item.name === 'Resolved')?.value ?? 0);
  const totalValue = pendingValue + reviewValue + resolvedValue;

  return (
    <div className='min-w-[190px] rounded-xl border border-primary/30 bg-white/95 p-3 shadow-[0_14px_30px_rgba(16,75,156,0.22)] backdrop-blur'>
      <p className='text-xs font-bold uppercase tracking-[1.4px] text-text-muted'>{label}</p>
      <div className='mt-2 space-y-1.5 text-sm'>
        <p className='flex items-center justify-between gap-3'>
          <span className='font-semibold text-[#5ea8f4]'>Pending</span>
          <span className='font-extrabold text-text-primary'>{pendingValue}</span>
        </p>
        <p className='flex items-center justify-between gap-3'>
          <span className='font-semibold text-[#226fc9]'>In Review</span>
          <span className='font-extrabold text-text-primary'>{reviewValue}</span>
        </p>
        <p className='flex items-center justify-between gap-3'>
          <span className='font-semibold text-[#093a75]'>Resolved</span>
          <span className='font-extrabold text-text-primary'>{resolvedValue}</span>
        </p>
      </div>
      <p className='mt-2 border-t border-border/70 pt-2 text-xs font-semibold text-text-secondary'>
        Total: {totalValue}
      </p>
    </div>
  );
};

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

  const totalPending = data.reduce((sum, item) => sum + item.pending, 0);
  const totalInReview = data.reduce((sum, item) => sum + item.inReview, 0);
  const totalResolved = data.reduce((sum, item) => sum + item.resolved, 0);
  const mostLoadedModule = data.reduce((heaviest, item) => {
    const heaviestTotal = heaviest.pending + heaviest.inReview + heaviest.resolved;
    const currentTotal = item.pending + item.inReview + item.resolved;
    return currentTotal > heaviestTotal ? item : heaviest;
  });

  return (
    <section className='card'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <h3 className='card-title'>Queue Workload Split</h3>
        <span className='rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-text-secondary'>
          Most loaded: {mostLoadedModule.module}
        </span>
      </div>
      <p className='mt-1 text-sm text-text-muted'>Pending, in-review, and resolved share by module.</p>

      <div className='relative mt-5 h-72 w-full overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(160deg,#fbfdff_0%,#e8f3ff_52%,#f5faff_100%)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]'>
        <div className='pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-300/35 blur-2xl' />
        <div className='pointer-events-none absolute -bottom-14 left-8 h-24 w-24 rounded-full bg-blue-300/30 blur-2xl' />

        <div className='mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold'>
          <span className='inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[#5ea8f4]'>
            <span className='h-2 w-2 rounded-full bg-[#5ea8f4]' />
            Pending
          </span>
          <span className='inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[#226fc9]'>
            <span className='h-2 w-2 rounded-full bg-[#226fc9]' />
            In Review
          </span>
          <span className='inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[#093a75]'>
            <span className='h-2 w-2 rounded-full bg-[#093a75]' />
            Resolved
          </span>
        </div>

        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 6 }}>
            <defs>
              <linearGradient id='pendingFill' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#8bc5ff' />
                <stop offset='100%' stopColor='#5ea8f4' />
              </linearGradient>
              <linearGradient id='inReviewFill' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#2f8aeb' />
                <stop offset='100%' stopColor='#226fc9' />
              </linearGradient>
              <linearGradient id='resolvedFill' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#0f4f9f' />
                <stop offset='100%' stopColor='#093a75' />
              </linearGradient>
            </defs>
            <CartesianGrid stroke='var(--color-border)' strokeDasharray='5 6' vertical={false} />
            <XAxis
              dataKey='module'
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<WorkloadTooltipContent />} />
            <Bar
              dataKey='pending'
              name='Pending'
              stackId='queue'
              fill='url(#pendingFill)'
              radius={[8, 8, 0, 0]}
              isAnimationActive={true}
              animationDuration={1000}
              barSize={34}
            />
            <Bar
              dataKey='inReview'
              name='In Review'
              stackId='queue'
              fill='url(#inReviewFill)'
              radius={[8, 8, 0, 0]}
              isAnimationActive={true}
              animationDuration={1200}
              barSize={34}
            />
            <Bar
              dataKey='resolved'
              name='Resolved'
              stackId='queue'
              fill='url(#resolvedFill)'
              radius={[8, 8, 0, 0]}
              isAnimationActive={true}
              animationDuration={1400}
              barSize={34}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='mt-4 grid gap-2 text-xs font-semibold text-text-muted sm:grid-cols-3'>
        <div className='rounded-xl border border-primary/20 bg-primary/5 px-3 py-2'>
          <p>Pending</p>
          <p className='mt-1 text-base font-extrabold tracking-tight text-text-primary'>{totalPending}</p>
        </div>
        <div className='rounded-xl border border-primary/20 bg-primary/5 px-3 py-2'>
          <p>In Review</p>
          <p className='mt-1 text-base font-extrabold tracking-tight text-text-primary'>{totalInReview}</p>
        </div>
        <div className='rounded-xl border border-primary/20 bg-primary/5 px-3 py-2'>
          <p>Resolved</p>
          <p className='mt-1 text-base font-extrabold tracking-tight text-text-primary'>{totalResolved}</p>
        </div>
      </div>
    </section>
  );
};
