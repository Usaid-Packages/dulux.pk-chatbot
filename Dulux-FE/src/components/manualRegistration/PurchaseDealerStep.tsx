import type { JSX } from 'react';

import { useFormContext } from 'react-hook-form';

import { Input, Textarea } from '#/components/ui';
import type { ManualRegistrationFormValues } from '#/types/manualRegistration';

/**
 * PurchaseDealerStep renders purchase metadata and dealer information for step 2.
 *
 * @returns Purchase and dealer step section.
 */
export const PurchaseDealerStep = (): JSX.Element => {
  const {
    register,
    formState: { errors },
  } = useFormContext<ManualRegistrationFormValues>();
  const todayDate = new Date().toISOString().split('T')[0];

  return (
    <section className='space-y-4 wf-card wf-card-p5'>
      <header>
        <h3 className='text-lg font-semibold text-text-primary'>Purchase & Dealer</h3>
        <p className='text-sm text-text-muted'>Capture where and when paint products were purchased.</p>
      </header>

      <div className='grid gap-4 md:grid-cols-2'>
        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Purchase Date</span>
          <Input type='date' max={todayDate} {...register('purchaseDate')} />
          {errors.purchaseDate ? <p className='text-xs text-destructive'>{errors.purchaseDate.message}</p> : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Dealer Name</span>
          <Input placeholder='e.g. Color World Traders' {...register('purchaseDealer')} />
          {errors.purchaseDealer ? <p className='text-xs text-destructive'>{errors.purchaseDealer.message}</p> : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Dealer City</span>
          <Input placeholder='e.g. Karachi' {...register('purchaseDealerCity')} />
          {errors.purchaseDealerCity ? (
            <p className='text-xs text-destructive'>{errors.purchaseDealerCity.message}</p>
          ) : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Dealer Address</span>
          <Input placeholder='Street, area, city' {...register('purchaseDealerAddress')} />
          {errors.purchaseDealerAddress ? (
            <p className='text-xs text-destructive'>{errors.purchaseDealerAddress.message}</p>
          ) : null}
        </label>
      </div>

      <label className='space-y-2'>
        <span className='text-sm font-medium text-text-primary'>Internal Notes (optional)</span>
        <Textarea rows={4} placeholder='Notes for internal review...' {...register('notes')} />
        {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
      </label>
    </section>
  );
};
