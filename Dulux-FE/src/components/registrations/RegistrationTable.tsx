import type { JSX, MouseEvent } from 'react';

import { Badge, Button, Empty, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/Table';
import { REGISTRATION_STATUS_LABELS } from '#/constants';
import type { RegistrationListItem, RegistrationStatus } from '#/types/registrations';
import { formatDisplayDate } from '#/utils';
import { SourceTag } from './SourceTag';

interface RegistrationTableProps {
  registrations: RegistrationListItem[];
  isLoading: boolean;
  onOpenDetail: (id: string) => void;
  onOpenEdit: (id: string) => void;
}

const getBadgeVariant = (status: RegistrationStatus): 'pending' | 'approved' | 'rejected' | 'info' => {
  if (status === 'APPROVED') {
    return 'approved';
  }

  if (status === 'REJECTED') {
    return 'rejected';
  }

  if (status === 'RESUBMIT') {
    return 'info';
  }

  return 'pending';
};

const CUSTOMER_NAME_TRUNCATE_LENGTH = 35;

const truncateCustomerName = (value: string): string => {
  if (value.length <= CUSTOMER_NAME_TRUNCATE_LENGTH) {
    return value;
  }

  return `${value.slice(0, CUSTOMER_NAME_TRUNCATE_LENGTH)}...`;
};

/**
 * RegistrationTable renders the registrations listing table with actions.
 *
 * @param props - Table rows and callbacks.
 * @returns Registrations table section.
 */
const EDITABLE_REGISTRATION_STATES: readonly RegistrationStatus[] = ['SUBMITTED', 'IN_PROGRESS', 'RESUBMIT'] as const;

export const RegistrationTable = ({
  registrations,
  isLoading,
  onOpenDetail,
  onOpenEdit,
}: RegistrationTableProps): JSX.Element => {
  const handleOpenDetailClick = (event: MouseEvent<HTMLButtonElement>): void => {
    const registrationId = event.currentTarget.dataset.registrationId;

    if (registrationId) {
      onOpenDetail(registrationId);
    }
  };

  const handleOpenEditClick = (event: MouseEvent<HTMLButtonElement>): void => {
    const registrationId = event.currentTarget.dataset.registrationId;

    if (registrationId) {
      onOpenEdit(registrationId);
    }
  };

  if (isLoading) {
    return (
      <section className='wf-card wf-card-p4 border-primary/15 bg-white/90'>
        <div className='space-y-3'>
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
        </div>
      </section>
    );
  }

  if (registrations.length === 0) {
    return (
      <section className='wf-card wf-card-p4 border-primary/15 bg-white/90'>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No registrations found</EmptyTitle>
            <EmptyDescription>Try updating your filters to see more records.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    );
  }

  return (
    <section className='wf-card wf-card-p4 border-primary/15 bg-white/90 ui-shadow-table'>
      <Table containerClassName='max-h-[62vh] overflow-y-auto overflow-x-auto'>
        <TableHeader>
          <TableRow>
            <TableHead>Reg. ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registrations.map(registration => (
            <TableRow key={registration.id}>
              <TableCell>
                <span className='inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary'>
                  {registration.registrationCode}
                </span>
              </TableCell>
              <TableCell>
                <span className='block max-w-[220px] truncate' title={registration.customerName}>
                  {truncateCustomerName(registration.customerName)}
                </span>
              </TableCell>
              <TableCell>{registration.phoneNumber}</TableCell>
              <TableCell>
                <SourceTag source={registration.channel} />
              </TableCell>
              <TableCell>{formatDisplayDate(registration.created)}</TableCell>
              <TableCell>
                <Badge variant={getBadgeVariant(registration.state)}>
                  {REGISTRATION_STATUS_LABELS[registration.state]}
                </Badge>
              </TableCell>
              <TableCell className='align-middle'>
                <div className='flex items-center gap-3'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='rounded-lg border-primary/25 bg-white text-primary hover:bg-primary/10'
                    data-registration-id={String(registration.id)}
                    onClick={handleOpenDetailClick}
                  >
                    View Detail
                  </Button>
                  <Button
                    type='button'
                    variant='link'
                    size='sm'
                    className='wf-table-link h-auto px-0 py-0'
                    data-registration-id={String(registration.id)}
                    onClick={handleOpenEditClick}
                    disabled={!EDITABLE_REGISTRATION_STATES.includes(registration.state)}
                    aria-label={`Edit ${registration.registrationCode}`}
                  >
                    Edit
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
};
