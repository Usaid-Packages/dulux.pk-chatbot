import type { JSX } from 'react';

import { Link } from 'react-router-dom';

import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui';
import { ROUTES } from '#/constants';
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
    <div className='rounded-lg border border-border bg-surface'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Claim ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Reg. ID</TableHead>
            <TableHead>Issue Type</TableHead>
            <TableHead>Photos</TableHead>
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
              <TableCell>{claim.customerName}</TableCell>
              <TableCell>
                <span className='chip-reg'>{claim.registrationId}</span>
              </TableCell>
              <TableCell>{claim.issueType}</TableCell>
              <TableCell>{claim.photoCount}</TableCell>
              <TableCell>{formatDate(claim.submittedAt)}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(claim.status)}>{getStatusLabel(claim.status)}</Badge>
              </TableCell>
              <TableCell>
                <Link className='text-sm font-semibold text-primary hover:underline' to={ROUTES.CLAIM_DETAIL(claim.id)}>
                  View detail
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
