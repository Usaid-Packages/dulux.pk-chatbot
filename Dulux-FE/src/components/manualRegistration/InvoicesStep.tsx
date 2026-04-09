import type { ChangeEvent, JSX } from 'react';
import { useMemo } from 'react';

import { useFormContext, useWatch } from 'react-hook-form';

import { Button, Input } from '#/components/ui';
import type { ManualRegistrationFormValues } from '#/types/manualRegistration';

const getSelectedFiles = (event: ChangeEvent<HTMLInputElement>): File[] => {
  const selectedFiles = event.currentTarget.files;
  return selectedFiles ? Array.from(selectedFiles) : [];
};

/**
 * InvoicesStep renders shared invoice upload controls for manual registration.
 *
 * @returns Invoice upload step section.
 */
export const InvoicesStep = (): JSX.Element => {
  const {
    setValue,
    formState: { errors },
    control,
  } = useFormContext<ManualRegistrationFormValues>();
  const invoices = useWatch({ control, name: 'invoices' }) ?? [];
  const invoiceItems = useMemo(() => {
    const signatureCounts = new Map<string, number>();

    return invoices.map(invoice => {
      const signature = `${invoice.name}-${invoice.size}-${invoice.type}-${invoice.lastModified}`;
      const nextCount = (signatureCounts.get(signature) ?? 0) + 1;
      signatureCounts.set(signature, nextCount);

      return {
        invoice,
        key: `${signature}-${nextCount}`,
      };
    });
  }, [invoices]);
  const firstInvoiceItemError = Array.isArray(errors.invoices)
    ? errors.invoices.find(invoiceError => Boolean(invoiceError?.message))?.message
    : null;

  const handleInvoicesChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const newlySelectedInvoices = getSelectedFiles(event);
    if (newlySelectedInvoices.length === 0) {
      return;
    }

    setValue('invoices', [...invoices, ...newlySelectedInvoices], {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleRemoveInvoice = (index: number): void => {
    const updatedInvoices = invoices.filter((_, invoiceIndex) => invoiceIndex !== index);
    setValue('invoices', updatedInvoices, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  return (
    <section className='space-y-4 wf-card wf-card-p5'>
      <header>
        <h3 className='text-lg font-semibold text-text-primary'>Invoices</h3>
        <p className='text-sm text-text-muted'>Upload one or more clear invoice images for verification.</p>
      </header>

      <label className='space-y-2'>
        <span className='text-sm font-medium text-text-primary'>Invoice Files</span>
        <Input type='file' accept='.jpg,.jpeg,.png' multiple onChange={handleInvoicesChange} />
        <p className='text-xs text-text-muted'>You can select multiple invoices in one go.</p>
      </label>

      {errors.invoices?.message ? <p className='text-xs text-destructive'>{errors.invoices.message}</p> : null}

      <div className='space-y-3 rounded-md border border-border p-4'>
        <p className='text-sm font-semibold text-text-primary'>Selected Invoices ({invoices.length})</p>

        {invoices.length === 0 ? (
          <p className='text-xs text-text-muted'>No invoices selected yet.</p>
        ) : (
          <ul className='space-y-2'>
            {invoiceItems.map((item, index) => (
              <li key={item.key} className='flex items-center justify-between gap-3'>
                <p className='min-w-0 flex-1 break-all text-xs text-text-muted'>{item.invoice.name}</p>
                <Button type='button' variant='outline' className='h-8 px-3' onClick={() => handleRemoveInvoice(index)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {firstInvoiceItemError ? <p className='text-xs text-destructive'>{firstInvoiceItemError}</p> : null}
    </section>
  );
};
