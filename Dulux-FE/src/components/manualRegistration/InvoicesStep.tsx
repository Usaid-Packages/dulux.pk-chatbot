import type { ChangeEvent, JSX } from 'react';

import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { Input } from '#/components/ui';
import type { ManualRegistrationFormValues } from '#/types/manualRegistration';

const getSelectedFile = (event: ChangeEvent<HTMLInputElement>): File | null => {
  const selectedFile = event.currentTarget.files?.[0];
  return selectedFile ?? null;
};

/**
 * InvoicesStep renders invoice upload controls for topcoat and basecoat.
 *
 * @returns Invoice upload step section.
 */
export const InvoicesStep = (): JSX.Element => {
  const {
    setValue,
    formState: { errors },
    control,
  } = useFormContext<ManualRegistrationFormValues>();
  const { fields } = useFieldArray({
    control,
    name: 'additionalPaintPairs',
  });

  const topcoatInvoice = useWatch({ control, name: 'topcoatInvoice' });
  const basecoatInvoice = useWatch({ control, name: 'basecoatInvoice' });
  const selectedBasecoat = useWatch({ control, name: 'basecoatProductId' });
  const additionalPaintPairs = useWatch({ control, name: 'additionalPaintPairs' });
  const hasBasecoat = Boolean(selectedBasecoat);

  const handleTopcoatFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setValue('topcoatInvoice', getSelectedFile(event), { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const handleBasecoatFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setValue('basecoatInvoice', getSelectedFile(event), { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const createAdditionalTopcoatFileChangeHandler =
    (index: number) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      setValue(`additionalPaintPairs.${index}.topcoatInvoice`, getSelectedFile(event), {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    };

  const createAdditionalBasecoatFileChangeHandler =
    (index: number) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      setValue(`additionalPaintPairs.${index}.basecoatInvoice`, getSelectedFile(event), {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    };

  return (
    <section className='space-y-4 wf-card wf-card-p5'>
      <header>
        <h3 className='text-lg font-semibold text-text-primary'>Invoices</h3>
        <p className='text-sm text-text-muted'>Upload clear invoice images or PDFs for verification.</p>
      </header>

      <div className='grid gap-4 md:grid-cols-2'>
        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Topcoat Invoice</span>
          <Input type='file' accept='.jpg,.jpeg,.png,.pdf' onChange={handleTopcoatFileChange} />
          {topcoatInvoice ? <p className='text-xs text-text-muted'>Selected: {topcoatInvoice.name}</p> : null}
          {errors.topcoatInvoice ? <p className='text-xs text-destructive'>{errors.topcoatInvoice.message}</p> : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>
            Basecoat Invoice {hasBasecoat ? '' : '(optional)'}
          </span>
          <Input
            type='file'
            accept='.jpg,.jpeg,.png,.pdf'
            disabled={!hasBasecoat}
            onChange={handleBasecoatFileChange}
          />
          {basecoatInvoice ? <p className='text-xs text-text-muted'>Selected: {basecoatInvoice.name}</p> : null}
          {errors.basecoatInvoice ? <p className='text-xs text-destructive'>{errors.basecoatInvoice.message}</p> : null}
        </label>
      </div>

      {fields.length > 0 ? (
        <div className='space-y-4'>
          {fields.map((field, index) => {
            const pairValues = additionalPaintPairs?.[index];
            const pairErrors = errors.additionalPaintPairs?.[index];
            const hasPairBasecoat = Boolean(pairValues?.basecoatProductId);

            return (
              <article key={field.id} className='space-y-4 rounded-md border border-border p-4'>
                <h4 className='text-sm font-semibold text-text-primary'>Paint Pair {index + 2} Invoices</h4>

                <div className='grid gap-4 md:grid-cols-2'>
                  <label className='space-y-2'>
                    <span className='text-sm font-medium text-text-primary'>Topcoat Invoice</span>
                    <Input
                      type='file'
                      accept='.jpg,.jpeg,.png,.pdf'
                      onChange={createAdditionalTopcoatFileChangeHandler(index)}
                    />
                    {pairValues?.topcoatInvoice ? (
                      <p className='text-xs text-text-muted'>Selected: {pairValues.topcoatInvoice.name}</p>
                    ) : null}
                    {pairErrors?.topcoatInvoice ? (
                      <p className='text-xs text-destructive'>{pairErrors.topcoatInvoice.message}</p>
                    ) : null}
                  </label>

                  <label className='space-y-2'>
                    <span className='text-sm font-medium text-text-primary'>
                      Basecoat Invoice {hasPairBasecoat ? '' : '(optional)'}
                    </span>
                    <Input
                      type='file'
                      accept='.jpg,.jpeg,.png,.pdf'
                      disabled={!hasPairBasecoat}
                      onChange={createAdditionalBasecoatFileChangeHandler(index)}
                    />
                    {pairValues?.basecoatInvoice ? (
                      <p className='text-xs text-text-muted'>Selected: {pairValues.basecoatInvoice.name}</p>
                    ) : null}
                    {pairErrors?.basecoatInvoice ? (
                      <p className='text-xs text-destructive'>{pairErrors.basecoatInvoice.message}</p>
                    ) : null}
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
