import type { JSX } from 'react';

import { Link, useLocation } from 'react-router-dom';

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui';
import { ROUTES, getClaimIssueTypeLabel } from '#/constants';
import type { ClaimListItem } from '#/types/claims.types';
import { formatDisplayDate } from '#/utils/date';
import { getStatusLabel, getStatusVariant } from './helpers';

interface ClaimsTableProps {
  claims: ClaimListItem[];
}

/**
 * ClaimsTable renders the claims list with key claim metadata and quick detail access.
 *
 * @param props - Claims table data.
 * @returns Claims table component.
 */
export const ClaimsTable = ({ claims }: ClaimsTableProps): JSX.Element => {
  const location = useLocation();

  return (
    <div className='wf-card wf-card-p4 border-primary/15 bg-white/90 shadow-[0_14px_28px_rgba(19,87,167,0.09)]'>
      <Table containerClassName='max-h-[62vh] overflow-y-auto overflow-x-auto border-primary/10'>
        <TableHeader>
          <TableRow>
            <TableHead>Claim ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Reg. ID</TableHead>
            <TableHead>Issue Type</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.map(claim => (
            <TableRow key={claim.id}>
              <TableCell>
                <span className='chip-claim'>{claim.claimNumber}</span>
              </TableCell>
              <TableCell>
                <span className='block max-w-[220px] truncate' title={claim.customerName || 'N/A'}>
                  {claim.customerName || 'N/A'}
                </span>
              </TableCell>
              <TableCell>
                <span className='chip-reg'>{claim.registrationId || 'N/A'}</span>
              </TableCell>
              <TableCell>{getClaimIssueTypeLabel(claim.issueType)}</TableCell>
              <TableCell>{formatDisplayDate(claim.submittedAt)}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(claim.status, claim.workflowState)}>
                  {getStatusLabel(claim.status, claim.workflowState)}
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
                  <Link to={`${ROUTES.CLAIM_DETAIL(claim.id)}${location.search}`}>View Detail</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
