import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { DashboardFlowCardModel } from '#/types/dashboard.types';
import { DashboardGrid } from '../DashboardGrid';

const FLOW_CARDS: DashboardFlowCardModel[] = [
  {
    id: 'registrationApprovals',
    title: 'Registration Approvals',
    icon: 'check',
    to: '/registrations',
    description: 'Review registrations.',
    screens: 4,
    stats: [
      { label: 'Pending', value: 12 },
      { label: 'Approved Today', value: 4 },
    ],
  },
];

const renderDashboardGrid = (flows: DashboardFlowCardModel[], isLoading = false): void => {
  render(
    <MemoryRouter>
      <DashboardGrid flows={flows} isLoading={isLoading} />
    </MemoryRouter>
  );
};

describe('DashboardGrid', () => {
  it('renders loading placeholders when loading is true', () => {
    renderDashboardGrid([], true);

    expect(screen.getByLabelText('Dashboard modules')).toBeInTheDocument();
  });

  it('renders empty state when no modules are available', () => {
    renderDashboardGrid([]);

    expect(screen.getByText('No modules available yet.')).toBeInTheDocument();
  });

  it('renders module card links with stats', () => {
    renderDashboardGrid(FLOW_CARDS);

    expect(screen.getByRole('link', { name: 'Open Registration Approvals' })).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
