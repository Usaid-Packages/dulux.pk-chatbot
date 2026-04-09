import type { JSX, MouseEvent } from 'react';

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui';
import type { AuditLogListItem } from '#/types/auditLogs';
import { formatAuditCreatedAt, getAuditActionBadgeVariant, getAuditActionLabel } from './helpers';

interface AuditLogsTableProps {
  items: AuditLogListItem[];
  onOpenDetail: (id: string) => void;
}

/**
 * AuditLogsTable renders paginated audit log rows and the detail action.
 *
 * @param props - Table rows and detail callback.
 * @returns Audit log table.
 */
export const AuditLogsTable = ({ items, onOpenDetail }: AuditLogsTableProps): JSX.Element => {
  const handleOpenDetailClick = (event: MouseEvent<HTMLButtonElement>): void => {
    const recordId = event.currentTarget.dataset.recordId;

    if (recordId) {
      onOpenDetail(recordId);
    }
  };

  return (
    <section className='wf-card wf-card-p4 border-primary/15 bg-white/90 shadow-[0_14px_28px_rgba(19,87,167,0.09)]'>
      <Table containerClassName='max-h-[62vh] overflow-y-auto overflow-x-auto border-primary/10'>
        <TableHeader>
          <TableRow>
            <TableHead>Created</TableHead>
            <TableHead>Actor Email</TableHead>
            <TableHead>Registration #</TableHead>
            <TableHead>Object ID</TableHead>
            <TableHead>Object Repr</TableHead>
            <TableHead>Event Label</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id}>
              <TableCell>{formatAuditCreatedAt(item.created)}</TableCell>
              <TableCell className='font-medium text-text-primary'>{item.actorEmail}</TableCell>
              <TableCell>
                {item.registrationNumber ? <span className='chip-reg'>{item.registrationNumber}</span> : 'N/A'}
              </TableCell>
              <TableCell>
                <span className='chip-reg'>{item.objectId}</span>
              </TableCell>
              <TableCell className='max-w-[260px] truncate' title={item.objectRepr}>
                {item.objectRepr}
              </TableCell>
              <TableCell className='max-w-[320px] truncate' title={item.eventLabel}>
                {item.eventLabel}
              </TableCell>
              <TableCell>
                <Badge variant={getAuditActionBadgeVariant(item.action)}>{getAuditActionLabel(item.action)}</Badge>
              </TableCell>
              <TableCell className='align-middle'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='rounded-lg border-primary/25 bg-white text-primary hover:bg-primary/10'
                  data-record-id={String(item.id)}
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
