import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { REGISTRATION_FILTER_TAB_LABELS, ROUTES } from '#/constants';
import { useEditRegistrationMutation, useGetRegistrationByIdQuery } from '#/data-layer/registrations';
import { useRegistrations } from '#/hooks/registrations';
import { registrationFilterTabs } from '#/types/registrations';
import { RegistrationsListPage } from '../RegistrationsListPage';

const mockNavigate = vi.fn();
const mockSetSearchValue = vi.fn();
const mockSetActiveTab = vi.fn();
const mockGoToNextPage = vi.fn();
const mockGoToPreviousPage = vi.fn();
const mockOpenDetail = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ search: '?status=pending' }),
  };
});

vi.mock('#/components/registrations', () => ({
  RegistrationTable: ({ onOpenDetail }: { onOpenDetail: (id: string) => void }) => {
    const handleClick = (): void => {
      onOpenDetail('REG-100');
      mockOpenDetail('REG-100');
    };

    return (
      <div>
        <p>Mock Registration Table</p>
        <button type='button' onClick={handleClick}>
          Open Detail
        </button>
      </div>
    );
  },
  RegistrationEditModal: () => null,
}));

vi.mock('#/hooks/registrations', () => ({
  useRegistrations: vi.fn(),
}));

vi.mock('#/data-layer/registrations', () => ({
  useGetRegistrationByIdQuery: vi.fn(),
  useEditRegistrationMutation: vi.fn(),
}));

const mockedUseRegistrations = vi.mocked(useRegistrations);
const mockedUseGetRegistrationByIdQuery = vi.mocked(useGetRegistrationByIdQuery);
const mockedUseEditRegistrationMutation = vi.mocked(useEditRegistrationMutation);

describe('RegistrationsListPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSetSearchValue.mockReset();
    mockSetActiveTab.mockReset();
    mockGoToNextPage.mockReset();
    mockGoToPreviousPage.mockReset();
    mockOpenDetail.mockReset();

    mockedUseRegistrations.mockReturnValue({
      activeTab: registrationFilterTabs[0],
      searchValue: '',
      currentPage: 1,
      totalPages: 3,
      registrations: [],
      stats: {
        total: 10,
        pending: 4,
        approved: 6,
      },
      isLoading: false,
      isError: false,
      errorMessage: '',
      hasNextPage: true,
      hasPreviousPage: false,
      setSearchValue: mockSetSearchValue,
      setActiveTab: mockSetActiveTab,
      goToNextPage: mockGoToNextPage,
      goToPreviousPage: mockGoToPreviousPage,
    });

    mockedUseGetRegistrationByIdQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGetRegistrationByIdQuery>);

    mockedUseEditRegistrationMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useEditRegistrationMutation>);
  });

  it('renders registration stats and pagination details', () => {
    render(<RegistrationsListPage />);

    expect(screen.getByText('Total Registrations')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Mock Registration Table')).toBeInTheDocument();
  });

  it('calls setActiveTab when a filter tab is clicked', () => {
    render(<RegistrationsListPage />);

    const targetTab = registrationFilterTabs[1];
    const targetTabLabel = REGISTRATION_FILTER_TAB_LABELS[targetTab];
    fireEvent.click(screen.getByRole('button', { name: targetTabLabel }));

    expect(mockSetActiveTab).toHaveBeenCalledWith(targetTab);
  });

  it('calls setSearchValue when the search input changes', () => {
    render(<RegistrationsListPage />);

    fireEvent.change(screen.getByLabelText('Search registrations'), {
      target: { value: 'customer-123' },
    });

    expect(mockSetSearchValue).toHaveBeenCalledWith('customer-123');
  });

  it('navigates to detail route with current query params on row open', () => {
    render(<RegistrationsListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Detail' }));

    expect(mockOpenDetail).toHaveBeenCalledWith('REG-100');
    expect(mockNavigate).toHaveBeenCalledWith(`${ROUTES.REGISTRATION_DETAIL('REG-100')}?status=pending`);
  });

  it('renders API error state when list query fails', () => {
    mockedUseRegistrations.mockReturnValue({
      activeTab: registrationFilterTabs[0],
      searchValue: '',
      currentPage: 1,
      totalPages: 1,
      registrations: [],
      stats: {
        total: 0,
        pending: 0,
        approved: 0,
      },
      isLoading: false,
      isError: true,
      errorMessage: 'Unable to load registrations',
      hasNextPage: false,
      hasPreviousPage: false,
      setSearchValue: mockSetSearchValue,
      setActiveTab: mockSetActiveTab,
      goToNextPage: mockGoToNextPage,
      goToPreviousPage: mockGoToPreviousPage,
    });

    render(<RegistrationsListPage />);

    expect(screen.getByText('Unable to load registrations')).toBeInTheDocument();
  });
});
