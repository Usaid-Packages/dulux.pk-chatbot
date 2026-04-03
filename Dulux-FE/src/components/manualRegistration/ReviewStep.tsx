import type { JSX } from 'react';

import { useFormContext, useWatch } from 'react-hook-form';

import type { ManualRegistrationFormValues } from '#/types/manualRegistration';

const renderReviewRow = (label: string, value?: string): JSX.Element => {
  return (
    <div key={label} className='rounded-md border border-border bg-surface-subtle p-3'>
      <p className='text-xs uppercase tracking-wide text-text-muted'>{label}</p>
      <p className='mt-1 text-sm font-medium text-text-primary'>{value ?? '—'}</p>
    </div>
  );
};

/**
 * ReviewStep renders a final summary before manual-registration submission.
 *
 * @returns Review step section.
 */
export const ReviewStep = (): JSX.Element => {
  const { control } = useFormContext<ManualRegistrationFormValues>();

  const values = useWatch({ control });

  return (
    <section className='space-y-4 rounded-lg border border-border bg-surface p-5'>
      <header>
        <h3 className='text-lg font-semibold text-text-primary'>Review</h3>
        <p className='text-sm text-text-muted'>Confirm all details before submitting this manual registration.</p>
      </header>

      <div className='space-y-3'>
        <h4 className='text-sm font-semibold text-text-primary'>Personal Information</h4>
        <div className='grid gap-3 md:grid-cols-2'>
          {renderReviewRow('Customer Name', values.customerName)}
          {renderReviewRow('Phone Number', values.phoneNumber)}
          {renderReviewRow('Email', values.email)}
          {renderReviewRow('City', values.city)}
          {renderReviewRow('Province', values.province)}
          {renderReviewRow('Postal Code', values.postalCode)}
          {renderReviewRow('Site Address', values.siteAddress)}
        </div>
      </div>

      <div className='space-y-3'>
        <h4 className='text-sm font-semibold text-text-primary'>Purchase & Dealer</h4>
        <div className='grid gap-3 md:grid-cols-2'>
          {renderReviewRow('Purchase Date', values.purchaseDate)}
          {renderReviewRow('Dealer Name', values.purchaseDealer)}
          {renderReviewRow('Dealer City', values.purchaseDealerCity)}
          {renderReviewRow('Dealer Address', values.purchaseDealerAddress)}
          {renderReviewRow('Notes', values.notes)}
        </div>
      </div>

      <div className='space-y-3'>
        <h4 className='text-sm font-semibold text-text-primary'>Products & Invoices</h4>
        <div className='grid gap-3 md:grid-cols-2'>
          {renderReviewRow('Topcoat Product', values.topcoatProductName)}
          {renderReviewRow('Topcoat Quantity', values.topcoatQuantity)}
          {renderReviewRow('Basecoat Product', values.basecoatProductName)}
          {renderReviewRow('Basecoat Quantity', values.basecoatQuantity)}
          {renderReviewRow('Topcoat Invoice', values.topcoatInvoice?.name)}
          {renderReviewRow('Basecoat Invoice', values.basecoatInvoice?.name)}
        </div>
      </div>
    </section>
  );
};
