import type { JSX, MouseEvent } from 'react';

import { Badge, Button, Empty, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/Table';
import { REGISTRATION_STATUS_LABELS } from '#/constants';
import type { RegistrationListItem, RegistrationStatus } from '#/types/registrations';
import { SourceTag } from './SourceTag';

interface RegistrationTableProps {
  registrations: RegistrationListItem[];
  isLoading: boolean;
  onOpenDetail: (id: string) => void;
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

/**
 * RegistrationTable renders the registrations listing table with actions.
 *
 * @param props - Table rows and callbacks.
 * @returns Registrations table section.
 */
export const RegistrationTable = ({ registrations, isLoading, onOpenDetail }: RegistrationTableProps): JSX.Element => {
  const handleOpenDetailClick = (event: MouseEvent<HTMLButtonElement>): void => {
    const registrationId = event.currentTarget.dataset.registrationId;

    if (registrationId) {
      onOpenDetail(registrationId);
    }
  };

  if (isLoading) {
    return (
      <section className='wf-card wf-card-p4'>
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
      <section className='wf-card wf-card-p4'>
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
    <section className='wf-card wf-card-p4'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reg. ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registrations.map(registration => (
            <TableRow key={registration.id}>
              <TableCell>
                <span className='inline-flex rounded-2xl border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold'>
                  {registration.registrationCode}
                </span>
              </TableCell>
              <TableCell>{registration.customerName}</TableCell>
              <TableCell>{registration.phoneNumber}</TableCell>
              <TableCell>{registration.city}</TableCell>
              <TableCell>
                <SourceTag source={registration.channel} />
              </TableCell>
              <TableCell>{new Date(registration.created).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge variant={getBadgeVariant(registration.state)}>
                  {REGISTRATION_STATUS_LABELS[registration.state]}
                </Badge>
              </TableCell>
              <TableCell className='text-right'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  data-registration-id={String(registration.id)}
                  onClick={handleOpenDetailClick}
                >
                  View Detail
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
};
