import type { JSX } from 'react';

import type { ConversationStats as ConversationStatsType } from '#/types/complaints';

interface ConversationStatsProps {
  stats?: ConversationStatsType;
}

const STAT_CARD_STYLES = [
  'border-primary/15 bg-[linear-gradient(140deg,#ffffff_0%,#eef6ff_100%)]',
  'border-primary/15 bg-[linear-gradient(140deg,#ffffff_0%,#eef6ff_100%)]',
  'border-slate-300/50 bg-[linear-gradient(140deg,#f8fafc_0%,#eef2f7_100%)]',
] as const;

/**
 * ConversationStats renders top-level chat queue KPI cards.
 *
 * @param props - Conversation stats payload.
 * @returns Stats cards.
 */
export const ConversationStats = ({ stats }: ConversationStatsProps): JSX.Element => {
  const items = [
    { label: 'Open', value: stats?.open ?? 0 },
    { label: 'In Progress', value: stats?.inProgress ?? 0 },
    { label: 'Closed', value: stats?.closed ?? 0 },
  ];

  return (
    <section className='wf-stat-grid-4'>
      {items.map((card, index) => (
        <article key={card.label} className={`wf-stat-card ${STAT_CARD_STYLES[index]}`}>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>{card.label}</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{card.value}</p>
        </article>
      ))}
    </section>
  );
};
