import type { JSX } from 'react';

import { Link, useLocation } from 'react-router-dom';

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui';
import { ROUTES, getClaimIssueTypeLabel } from '#/constants';
import type { QualityQueueItem } from '#/types/quality.types';
import { getQualityStatusLabel, getQualityStatusVariant, formatDate } from './helpers';

interface QualityQueueTableProps {
  items: QualityQueueItem[];
}

/**
 * QualityQueueTable renders the QA work queue with forwarding context.
 *
 * @param props - Queue list items.
 * @returns Queue table component.
 */
export const QualityQueueTable = ({ items }: QualityQueueTableProps): JSX.Element => {
  const location = useLocation();

  return (
    <div className='wf-card wf-card-p4 border-primary/15 bg-white/90 shadow-[0_14px_28px_rgba(19,87,167,0.09)]'>
      <Table containerClassName='max-h-[62vh] overflow-y-auto overflow-x-auto border-primary/10'>
        <TableHeader>
          <TableRow>
            <TableHead>Claim ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Reg. ID</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>Forwarded By</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id}>
              <TableCell>
                <span className='chip-claim'>{item.claimNumber || item.id}</span>
              </TableCell>
              <TableCell>
                <span className='block max-w-[220px] truncate' title={item.customerName}>
                  {item.customerName}
                </span>
              </TableCell>
              <TableCell>
                <span className='chip-reg'>{item.registrationNumber}</span>
              </TableCell>
              <TableCell>{getClaimIssueTypeLabel(item.issueType)}</TableCell>
              <TableCell>{item.forwardedBy}</TableCell>
              <TableCell>{formatDate(item.submittedAt)}</TableCell>
              <TableCell>
                <Badge variant={getQualityStatusVariant(item.status, item.workflowState)}>
                  {getQualityStatusLabel(item.status, item.workflowState)}
                </Badge>
              </TableCell>
              <TableCell className='align-middle'>
                <Button
                  asChild
                  type='button'
                  variant='outline'
                  size='sm'
                  className='rounded-lg border-primary/25 bg-white text-primary hover:bg-primary/10'
                >
                  <Link to={`${ROUTES.QUALITY_DETAIL(item.id)}${location.search}`}>View Detail</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
