import type { JSX } from 'react';

import type { ConversationStats as ConversationStatsType } from '#/types/complaints';

interface ConversationStatsProps {
  stats?: ConversationStatsType;
}

const STAT_CARD_STYLES = [
  'border-l-4 border-l-convStatus-active-text',
  'border-l-4 border-l-convStatus-active-text',
  'border-l-4 border-l-convStatus-resolved-text',
  'border-l-4 border-l-convStatus-resolved-text',
] as const;

/**
 * ConversationStats renders top-level chat queue KPI cards.
 *
 * @param props - Conversation stats payload.
 * @returns Stats cards.
 */
export const ConversationStats = ({ stats }: ConversationStatsProps): JSX.Element => {
  const items = [
    { label: 'OPEN', value: stats?.open ?? 0 },
    { label: 'IN_PROGRESS', value: stats?.inProgress ?? 0 },
    { label: 'RESOLVED', value: stats?.resolved ?? 0 },
    { label: 'CLOSED', value: stats?.closed ?? 0 },
  ];

  return (
    <section className='wf-stat-grid-4'>
      {items.map((card, index) => (
        <article key={card.label} className={`wf-stat-card ${STAT_CARD_STYLES[index]}`}>
          <p className='text-sm text-text-muted'>{card.label}</p>
          <p className='mt-1 text-2xl font-bold text-text-primary'>{card.value}</p>
        </article>
      ))}
    </section>
  );
};
