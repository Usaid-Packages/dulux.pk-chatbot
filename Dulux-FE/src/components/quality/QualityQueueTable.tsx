/* eslint import/order: off */
import type { JSX } from 'react';

import { Link } from 'react-router-dom';

import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui';
import { ROUTES } from '#/constants';
import type { QualityQueueItem } from '#/types/quality.types';
import {
  getPriorityClass,
  getPriorityLabel,
  getQualityStatusLabel,
  getQualityStatusVariant,
  formatDate,
} from './helpers';

interface QualityQueueTableProps {
  items: QualityQueueItem[];
}

/**
 * QualityQueueTable renders the QA work queue with priority and forwarding context.
 *
 * @param props - Queue list items.
 * @returns Queue table component.
 */
export const QualityQueueTable = ({ items }: QualityQueueTableProps): JSX.Element => {
  return (
    <div className='rounded-lg border border-border bg-surface'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Claim ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Priority</TableHead>
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
                <span className='chip-claim'>{item.claimNumber}</span>
              </TableCell>
              <TableCell>{item.customerName}</TableCell>
              <TableCell>{item.issueType}</TableCell>
              <TableCell>{item.city}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getPriorityClass(item.priority)}`}
                >
                  {getPriorityLabel(item.priority)}
                </span>
              </TableCell>
              <TableCell>{item.forwardedBy}</TableCell>
              <TableCell>{formatDate(item.submittedAt)}</TableCell>
              <TableCell>
                <Badge variant={getQualityStatusVariant(item.status)}>{getQualityStatusLabel(item.status)}</Badge>
              </TableCell>
              <TableCell>
                <Link
                  to={ROUTES.QUALITY_DETAIL(item.id)}
                  className='text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                >
                  Open
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
