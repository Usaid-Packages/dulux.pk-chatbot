import type { JSX } from 'react';

import { Link } from 'react-router-dom';

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui';
import { ROUTES, getClaimIssueTypeLabel } from '#/constants';
import type { ClaimListItem } from '#/types/claims.types';
import { formatDate, getStatusLabel, getStatusVariant } from './helpers';

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
  return (
    <div className='wf-card'>
      <Table>
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
              <TableCell>{claim.customerName || 'N/A'}</TableCell>
              <TableCell>
                <span className='chip-reg'>{claim.registrationId || 'N/A'}</span>
              </TableCell>
              <TableCell>{getClaimIssueTypeLabel(claim.issueType)}</TableCell>
              <TableCell>{formatDate(claim.submittedAt)}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(claim.status)}>{getStatusLabel(claim.status)}</Badge>
              </TableCell>
              <TableCell>
                <Button asChild type='button' variant='outline' size='sm'>
                  <Link to={ROUTES.CLAIM_DETAIL(claim.id)}>View Detail</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
