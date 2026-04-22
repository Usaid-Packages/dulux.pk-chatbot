import React, { useMemo, useRef } from 'react';

import { FileImage, Trash2, UploadCloud } from 'lucide-react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Button, Input } from '#/components/ui';
import type { ManualRegistrationFormValues } from '#/types/manualRegistration';

const getSelectedFiles = (event: React.ChangeEvent<HTMLInputElement>): File[] => {
  const selectedFiles = event.currentTarget.files;
  return selectedFiles ? Array.from(selectedFiles) : [];
};

/**
 * InvoicesStep renders shared invoice upload controls for manual registration.
 *
 * @returns Invoice upload step section.
 */
export const InvoicesStep = (): React.JSX.Element => {
  const {
    setValue,
    formState: { errors },
    control,
  } = useFormContext<ManualRegistrationFormValues>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  const handleOpenFileSelector = (): void => {
    fileInputRef.current?.click();
  };

  const handleInvoicesChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
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

  const handleRemoveInvoiceClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    const invoiceIndexValue = event.currentTarget.dataset.invoiceIndex;
    const invoiceIndex = Number(invoiceIndexValue);
    if (!Number.isInteger(invoiceIndex) || invoiceIndex < 0) {
      return;
    }

    handleRemoveInvoice(invoiceIndex);
  };

  return (
    <section className='space-y-4 wf-card wf-card-p5'>
      <header>
        <h3 className='text-lg font-semibold text-text-primary'>Invoices</h3>
        <p className='text-sm text-text-muted'>
          Upload clear invoice images (JPG or PNG) so the review team can verify the purchase quickly.
        </p>
      </header>

      <section className='rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <span className='rounded-full bg-white p-3 text-primary shadow-sm'>
            <UploadCloud aria-hidden='true' className='h-6 w-6' />
          </span>
          <div className='space-y-1'>
            <p className='text-sm font-semibold text-text-primary'>
              Invoice Files <span className='text-destructive'>*</span>
            </p>
            <p className='text-xs text-text-muted'>Click to choose one or more images. Max size: 5MB each.</p>
          </div>
          <Button
            type='button'
            variant='outline'
            className='rounded-xl border-primary/25 bg-white text-primary hover:bg-primary/10'
            onClick={handleOpenFileSelector}
          >
            Select Invoice Images
          </Button>
        </div>
      </section>

      <Input
        ref={fileInputRef}
        type='file'
        accept='.jpg,.jpeg,.png'
        multiple
        className='hidden'
        onChange={handleInvoicesChange}
      />

      {errors.invoices?.message ? <p className='text-xs text-destructive'>{errors.invoices.message}</p> : null}

      <div className='space-y-3 rounded-xl border border-border bg-white p-4'>
        <p className='text-sm font-semibold text-text-primary'>Selected Invoices ({invoices.length})</p>

        {invoices.length === 0 ? (
          <p className='text-xs text-text-muted'>No invoices selected yet.</p>
        ) : (
          <ul className='space-y-2'>
            {invoiceItems.map((item, index) => (
              <li
                key={item.key}
                className='flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3'
              >
                <div className='flex min-w-0 flex-1 items-center gap-2'>
                  <FileImage aria-hidden='true' className='h-4 w-4 shrink-0 text-primary' />
                  <div className='min-w-0'>
                    <p className='truncate text-xs font-medium text-text-primary'>{item.invoice.name}</p>
                    <p className='text-[11px] text-text-muted'>{(item.invoice.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  className='h-8 rounded-lg border-destructive/30 px-2.5 text-destructive hover:bg-destructive/10'
                  data-invoice-index={index}
                  onClick={handleRemoveInvoiceClick}
                >
                  <Trash2 aria-hidden='true' className='h-3.5 w-3.5' />
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
