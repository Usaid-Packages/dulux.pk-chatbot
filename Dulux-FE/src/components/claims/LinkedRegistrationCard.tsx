import type { JSX } from 'react';

import { Link, useLocation } from 'react-router-dom';

import { ROUTES } from '#/constants';
import type { LinkedRegistrationSummary } from '#/types/claims.types';
import { formatDisplayDate } from '#/utils/date';

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
  const location = useLocation();
  const canOpenRegistration = registration.registrationRecordId !== 'N/A';
  const registrationDetailPath = ROUTES.REGISTRATION_DETAIL(registration.registrationRecordId);
  const backToPath = `${location.pathname}${location.search}`;

  return (
    <section className='wf-card wf-card-p4 border-primary/15 bg-white/95'>
      <h2 className='text-md font-semibold text-text-primary'>Linked Registration</h2>
      <dl className='mt-3 grid gap-2 text-sm'>
        <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
          <dt className='text-text-muted'>Registration ID</dt>
          <dd>
            <span className='chip-reg'>{registration.registrationId}</span>
          </dd>
        </div>
        <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
          <dt className='text-text-muted'>Customer</dt>
          <dd className='font-medium text-text-primary'>{registration.customerName}</dd>
        </div>
        <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
          <dt className='text-text-muted'>Purchase Date</dt>
          <dd className='font-medium text-text-primary'>{formatDisplayDate(registration.purchaseDate)}</dd>
        </div>
      </dl>
      {canOpenRegistration ? (
        <Link
          className='mt-3 inline-block text-sm font-semibold text-primary hover:underline'
          to={registrationDetailPath}
          state={{ backTo: backToPath }}
        >
          Open registration
        </Link>
      ) : (
        <p className='mt-3 text-sm text-text-muted'>Registration link unavailable</p>
      )}
    </section>
  );
};
