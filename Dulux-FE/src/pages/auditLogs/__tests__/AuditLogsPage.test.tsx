import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuditLogs } from '#/hooks/auditLogs';
import { AuditLogsPage } from '../AuditLogsPage';

const mockSetPage = vi.fn();
const mockOpenDetail = vi.fn();

vi.mock('#/components/auditLogs', () => ({
  AuditLogsFilters: () => <div>Audit Filters</div>,
  AuditLogsTable: ({ items, onOpenDetail }: { items: Array<{ id: string }>; onOpenDetail: (id: string) => void }) => (
    <div>
      <p>Audit Table {items.length}</p>
      <button type='button' onClick={() => onOpenDetail(items[0]?.id ?? '')}>
        Open Audit Detail
      </button>
    </div>
  ),
  AuditLogDetailDialog: ({ isOpen }: { isOpen: boolean }) => <div>{isOpen ? 'Detail Open' : 'Detail Closed'}</div>,
}));

vi.mock('#/hooks/auditLogs', () => ({
  useAuditLogs: vi.fn(),
}));

const mockedUseAuditLogs = vi.mocked(useAuditLogs);

describe('AuditLogsPage', () => {
  beforeEach(() => {
    mockSetPage.mockReset();
    mockOpenDetail.mockReset();

    mockedUseAuditLogs.mockReturnValue({
      filters: {
        page: 1,
      },
      auditLogsQuery: {
        isLoading: false,
        isError: false,
        data: {
          items: [
            { id: '1', action: 'CREATE' },
            { id: '2', action: 'UPDATE' },
            { id: '3', action: 'DELETE' },
          ],
          total: 13,
        },
      },
      detailQuery: {
        isLoading: false,
        isError: false,
        data: null,
      },
      selectedAuditLogId: '',
      setActionFilter: vi.fn(),
      setOrdering: vi.fn(),
      setActorFilter: vi.fn(),
      setModelLabelFilter: vi.fn(),
      setObjectIdFilter: vi.fn(),
      setDateFromFilter: vi.fn(),
      setDateToFilter: vi.fn(),
      setSearch: vi.fn(),
      setPage: mockSetPage,
      openDetail: mockOpenDetail,
      closeDetail: vi.fn(),
    } as unknown as ReturnType<typeof useAuditLogs>);
  });

  it('renders stats, table, and pagination interactions', () => {
    render(<AuditLogsPage />);

    expect(screen.getByText('Total Logs')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText('Audit Table 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Audit Detail' }));

    expect(mockSetPage).toHaveBeenCalledWith(2);
    expect(mockOpenDetail).toHaveBeenCalledWith('1');
  });

  it('renders API error state', () => {
    mockedUseAuditLogs.mockReturnValue({
      filters: {
        page: 1,
      },
      auditLogsQuery: {
        isLoading: false,
        isError: true,
        error: new Error('Audit error'),
        data: null,
      },
      detailQuery: {
        isLoading: false,
        isError: false,
        data: null,
      },
      selectedAuditLogId: '',
      setActionFilter: vi.fn(),
      setOrdering: vi.fn(),
      setActorFilter: vi.fn(),
      setModelLabelFilter: vi.fn(),
      setObjectIdFilter: vi.fn(),
      setDateFromFilter: vi.fn(),
      setDateToFilter: vi.fn(),
      setSearch: vi.fn(),
      setPage: mockSetPage,
      openDetail: mockOpenDetail,
      closeDetail: vi.fn(),
    } as unknown as ReturnType<typeof useAuditLogs>);

    render(<AuditLogsPage />);

    expect(screen.getByText('Failed to load audit logs')).toBeInTheDocument();
  });
});
