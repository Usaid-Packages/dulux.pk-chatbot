import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDashboard } from '#/hooks';
import type { DashboardAnalyticsModel, DashboardFlowCardModel } from '#/types/dashboard.types';
import { DashboardPage } from '../DashboardPage';

vi.mock('#/hooks', () => ({
  useDashboard: vi.fn(),
}));

const mockedUseDashboard = vi.mocked(useDashboard);

const EMPTY_ANALYTICS: DashboardAnalyticsModel = {
  trendSeries: [],
  workloadSeries: [],
};

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
  {
    id: 'claimsApprovals',
    title: 'Claims Approvals',
    icon: 'alert',
    to: '/claims',
    description: 'Review claims.',
    screens: 5,
    stats: [{ label: 'Pending CS Review', value: 7 }],
  },
];

const renderDashboardPage = (): void => {
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    mockedUseDashboard.mockReturnValue({
      flowCards: FLOW_CARDS,
      analytics: EMPTY_ANALYTICS,
      isLoading: false,
      isError: false,
      isRefetching: false,
      errorMessage: '',
      refetchDashboard: vi.fn(),
    });
  });

  it('renders dashboard headings and module cards from hook data', () => {
    renderDashboardPage();

    expect(screen.getByRole('heading', { name: 'Operational Overview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Performance Insights' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Registration Approvals' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Claims Approvals' })).toBeInTheDocument();
  });

  it('renders error banner when dashboard hook reports an error', () => {
    mockedUseDashboard.mockReturnValue({
      flowCards: FLOW_CARDS,
      analytics: EMPTY_ANALYTICS,
      isLoading: false,
      isError: true,
      isRefetching: false,
      errorMessage: 'Network timeout',
      refetchDashboard: vi.fn(),
    });

    renderDashboardPage();

    expect(screen.getByRole('alert')).toHaveTextContent('Dashboard data could not be refreshed.');
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
  });

  it('renders loading grid state while module cards are loading', () => {
    mockedUseDashboard.mockReturnValue({
      flowCards: [],
      analytics: EMPTY_ANALYTICS,
      isLoading: true,
      isError: false,
      isRefetching: false,
      errorMessage: '',
      refetchDashboard: vi.fn(),
    });

    renderDashboardPage();

    expect(screen.getByLabelText('Dashboard modules')).toBeInTheDocument();
    expect(screen.queryByText('No modules available yet.')).not.toBeInTheDocument();
  });

  it('renders empty module state when no cards are available', () => {
    mockedUseDashboard.mockReturnValue({
      flowCards: [],
      analytics: EMPTY_ANALYTICS,
      isLoading: false,
      isError: false,
      isRefetching: false,
      errorMessage: '',
      refetchDashboard: vi.fn(),
    });

    renderDashboardPage();

    expect(screen.getByText('No modules available yet.')).toBeInTheDocument();
  });
});
