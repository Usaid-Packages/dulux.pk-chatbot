import type { JSX } from 'react';

import { Link } from 'react-router-dom';

import { ROUTES } from '#/constants';
import type { LinkedRegistrationSummary } from '#/types/claims.types';
import { formatDate } from './helpers';

interface LinkedRegistrationCardProps {
  registration: LinkedRegistrationSummary;
}

/**
 * LinkedRegistrationCard shows the warranty registration tied to a claim.
 *
 * @param props - Linked registration details.
 * @returns Registration summary card.
 */
export const LinkedRegistrationCard = ({ registration }: LinkedRegistrationCardProps): JSX.Element => {
  return (
    <section className='wf-card wf-card-p4'>
      <h2 className='text-md font-semibold text-text-primary'>Linked Registration</h2>
      <dl className='mt-3 grid gap-2 text-sm'>
        <div className='flex justify-between gap-2'>
          <dt className='text-text-muted'>Registration ID</dt>
          <dd>
            <span className='chip-reg'>{registration.registrationId}</span>
          </dd>
        </div>
        <div className='flex justify-between gap-2'>
          <dt className='text-text-muted'>Customer</dt>
          <dd className='font-medium text-text-primary'>{registration.customerName}</dd>
        </div>
        <div className='flex justify-between gap-2'>
          <dt className='text-text-muted'>Purchase Date</dt>
          <dd className='font-medium text-text-primary'>{formatDate(registration.purchaseDate)}</dd>
        </div>
        <div className='flex justify-between gap-2'>
          <dt className='text-text-muted'>Dealer</dt>
          <dd className='font-medium text-text-primary'>{registration.dealerName}</dd>
        </div>
      </dl>
      <Link
        className='mt-3 inline-block text-sm font-semibold text-primary hover:underline'
        to={ROUTES.REGISTRATION_DETAIL(registration.registrationId)}
      >
        Open registration
      </Link>
    </section>
  );
};
