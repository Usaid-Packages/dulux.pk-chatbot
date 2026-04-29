import type { ChangeEvent, JSX } from 'react';

import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Input } from '#/components/ui/Input';
import { REGISTRATION_INVOICE_TYPES } from '#/constants';
import { RESUBMIT_FIELD_LABELS } from '#/constants/registrations';
import type { ResubmitUpdateFormValues } from '#/schemas/registrations';
import type { RegistrationDetail, RegistrationRejectionField } from '#/types/registrations';

interface ResubmitUpdateInvoiceSectionProps {
  requestedFieldNames: RegistrationRejectionField['fieldName'][];
  control: Control<ResubmitUpdateFormValues>;
  registration: RegistrationDetail;
  buildInvoiceFilesChangeHandler: (onChange: (value: File[]) => void) => (event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Renders requested invoice-upload section for resubmission updates.
 *
 * @param props - Requested fields, form control and file handler adapter.
 * @returns Invoice upload section or null when not requested.
 */
export const ResubmitUpdateInvoiceSection = ({
  requestedFieldNames,
  control,
  registration,
  buildInvoiceFilesChangeHandler,
}: ResubmitUpdateInvoiceSectionProps): JSX.Element | null => {
  if (!requestedFieldNames.includes('paint_pair_invoices')) {
    return null;
  }

  return (
    <section className='space-y-2 rounded-xl border border-primary/15 p-3'>
      <h3 className='text-sm font-semibold text-text-primary'>{RESUBMIT_FIELD_LABELS.paint_pair_invoices}</h3>
      <p className='text-xs text-text-muted'>
        Upload new invoice images to replace existing invoice photos. If you skip uploads, existing invoice images
        remain unchanged.
      </p>
      <Controller
        control={control}
        name='invoiceFiles'
        render={({ field }) => (
          <Input
            type='file'
            accept='image/png,image/jpeg,image/jpg'
            multiple
            onChange={buildInvoiceFilesChangeHandler(field.onChange)}
          />
        )}
      />
      <p className='text-xs text-text-muted'>
        Existing invoices: {registration.paintPairInvoices.length} ({REGISTRATION_INVOICE_TYPES.TOPCOAT}/
        {REGISTRATION_INVOICE_TYPES.BASECOAT})
      </p>
    </section>
  );
};
