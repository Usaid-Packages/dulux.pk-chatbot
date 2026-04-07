import type { JSX } from 'react';

import type { ConversationStats as ConversationStatsType } from '#/types/complaints';

interface ConversationStatsProps {
  stats?: ConversationStatsType;
}

const STAT_CARD_STYLES = [
  '',
  'border-l-4 border-l-chat-unreadDot',
  'border-l-4 border-l-convStatus-active-text',
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
    { label: 'Total Conversations', value: stats?.totalConversations ?? 0 },
    { label: 'Unread Messages', value: stats?.unreadMessages ?? 0 },
    { label: 'Active Threads', value: stats?.active ?? 0 },
    { label: 'Resolved Threads', value: stats?.resolved ?? 0 },
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
