import type { ChangeEvent, JSX, MouseEvent } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui';
import { Input } from '#/components/ui/Input';
import { Textarea } from '#/components/ui/Textarea';
import { REGISTRATION_INVOICE_TYPES } from '#/constants';
import { resubmitUpdateSchema, type ResubmitUpdateFormValues } from '#/schemas/registrations';
import type { RegistrationDetail, RegistrationRejectionField } from '#/types/registrations';

interface ResubmitUpdateModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  registration: RegistrationDetail;
  onClose: () => void;
  onSubmit: (values: ResubmitUpdateFormValues) => void;
}

const FIELD_LABELS: Record<RegistrationRejectionField['fieldName'], string> = {
  customer_name: 'Full Name',
  phone_number: 'Phone Number',
  email: 'Email',
  city: 'City',
  province: 'Province',
  site_address: 'Site Address',
  purchase_date: 'Purchase Date',
  purchase_dealer: 'Dealer Name',
  purchase_dealer_city: 'Dealer City',
  purchase_dealer_address: 'Dealer Address',
  postal_code: 'Postal Code',
  paint_pairs: 'Paint Details',
  paint_pair_invoices: 'Invoice Photos',
};

const REQUESTED_FIELD_ORDER: RegistrationRejectionField['fieldName'][] = [
  'customer_name',
  'phone_number',
  'email',
  'city',
  'province',
  'site_address',
  'purchase_date',
  'purchase_dealer',
  'purchase_dealer_city',
  'purchase_dealer_address',
  'postal_code',
  'paint_pairs',
  'paint_pair_invoices',
];

const getRequestedFieldNames = (
  rejectionFields: RegistrationRejectionField[]
): RegistrationRejectionField['fieldName'][] => {
  const names = new Set(rejectionFields.map(field => field.fieldName));
  return REQUESTED_FIELD_ORDER.filter(fieldName => names.has(fieldName));
};

const getFieldNote = (
  rejectionFields: RegistrationRejectionField[],
  fieldName: RegistrationRejectionField['fieldName']
): RegistrationRejectionField | null => {
  return rejectionFields.find(field => field.fieldName === fieldName) ?? null;
};

const formatNoteTimestamp = (value: string): string => {
  if (!value.trim()) {
    return '';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-PK', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
};

/**
 * ResubmitUpdateModal renders editable fields requested in registration RESUBMIT state.
 *
 * @param props - Dialog state, registration detail and submit handlers.
 * @returns Resubmit update modal component.
 */
export const ResubmitUpdateModal = ({
  isOpen,
  isSubmitting,
  registration,
  onClose,
  onSubmit,
}: ResubmitUpdateModalProps): JSX.Element => {
  const requestedFieldNames = getRequestedFieldNames(registration.rejectionFields);
  const defaultPaintPairs =
    registration.paintPairs.length > 0
      ? registration.paintPairs.map(pair => ({
          topcoatId: String(pair.topcoat.id),
          topcoatQuantity: pair.topcoatQuantity,
          basecoatId: pair.basecoat?.id ? String(pair.basecoat.id) : '',
          basecoatQuantity: pair.basecoatQuantity ?? '',
        }))
      : [
          {
            topcoatId: '',
            topcoatQuantity: '',
            basecoatId: '',
            basecoatQuantity: '',
          },
        ];

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResubmitUpdateFormValues>({
    resolver: zodResolver(resubmitUpdateSchema),
    defaultValues: {
      customerName: registration.customerName,
      phoneNumber: registration.phoneNumber,
      email: registration.email,
      city: registration.city,
      province: registration.province,
      siteAddress: registration.siteAddress,
      purchaseDate: registration.purchaseDate,
      purchaseDealer: registration.purchaseDealer,
      purchaseDealerCity: registration.purchaseDealerCity,
      purchaseDealerAddress: registration.purchaseDealerAddress,
      postalCode: registration.postalCode,
      paintPairs: defaultPaintPairs,
      invoiceFiles: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'paintPairs',
  });

  const handleModalClose = (): void => {
    reset();
    onClose();
  };

  const handleAddPaintPair = (): void => {
    append({
      topcoatId: '',
      topcoatQuantity: '',
      basecoatId: '',
      basecoatQuantity: '',
    });
  };

  const handleRemovePaintPair = (event: MouseEvent<HTMLButtonElement>): void => {
    const indexValue = event.currentTarget.dataset.index;
    const index = Number.parseInt(indexValue ?? '', 10);

    if (Number.isInteger(index) && index >= 0) {
      remove(index);
    }
  };

  const renderFieldNote = (fieldName: RegistrationRejectionField['fieldName']): JSX.Element | null => {
    const noteField = getFieldNote(registration.rejectionFields, fieldName);
    const noteValue = noteField?.note?.trim() ?? '';
    if (!noteValue) {
      return null;
    }
    const noteTimestamp = noteField ? formatNoteTimestamp(noteField.created) : '';

    return (
      <div className='mt-2 rounded-lg border border-warning/30 bg-warning/10 p-2'>
        <div className='flex items-start gap-2'>
          <Info className='mt-0.5 h-3.5 w-3.5 shrink-0 text-warning' />
          <div className='space-y-1'>
            <p className='text-[11px] font-semibold uppercase tracking-wide text-warning'>Requested Correction</p>
            <p className='text-xs leading-5 text-text-primary'>{noteValue}</p>
            {noteTimestamp ? <p className='text-[11px] text-text-muted'>Added: {noteTimestamp}</p> : null}
          </div>
        </div>
      </div>
    );
  };

  const handleInvoiceFilesChange = (onChange: (value: File[]) => void, event: ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    onChange(files);
  };

  const handleFormSubmit = (values: ResubmitUpdateFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className='flex max-h-[85vh] flex-col overflow-hidden border-primary/20 bg-white sm:max-w-[760px]'>
        <DialogHeader>
          <DialogTitle>Submit Resubmission Changes</DialogTitle>
          <DialogDescription>Update only the requested fields and send them back for review.</DialogDescription>
        </DialogHeader>

        <form className='flex min-h-0 flex-1 flex-col' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
            {requestedFieldNames.includes('customer_name') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Full Name</label>
                <Input {...register('customerName')} />
                {errors.customerName ? (
                  <p className='mt-1 text-xs text-destructive'>{errors.customerName.message}</p>
                ) : null}
                {renderFieldNote('customer_name')}
              </div>
            ) : null}

            {requestedFieldNames.includes('phone_number') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Phone Number</label>
                <Input {...register('phoneNumber')} />
                {errors.phoneNumber ? (
                  <p className='mt-1 text-xs text-destructive'>{errors.phoneNumber.message}</p>
                ) : null}
                {renderFieldNote('phone_number')}
              </div>
            ) : null}

            {requestedFieldNames.includes('email') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Email</label>
                <Input type='email' {...register('email')} />
                {errors.email ? <p className='mt-1 text-xs text-destructive'>{errors.email.message}</p> : null}
                {renderFieldNote('email')}
              </div>
            ) : null}

            {requestedFieldNames.includes('city') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>City</label>
                <Input {...register('city')} />
                {renderFieldNote('city')}
              </div>
            ) : null}

            {requestedFieldNames.includes('province') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Province</label>
                <Input {...register('province')} />
                {renderFieldNote('province')}
              </div>
            ) : null}

            {requestedFieldNames.includes('site_address') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Site Address</label>
                <Textarea rows={2} {...register('siteAddress')} />
                {renderFieldNote('site_address')}
              </div>
            ) : null}

            {requestedFieldNames.includes('purchase_date') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Purchase Date</label>
                <Input type='date' {...register('purchaseDate')} />
                {renderFieldNote('purchase_date')}
              </div>
            ) : null}

            {requestedFieldNames.includes('purchase_dealer') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Dealer Name</label>
                <Input {...register('purchaseDealer')} />
                {renderFieldNote('purchase_dealer')}
              </div>
            ) : null}

            {requestedFieldNames.includes('purchase_dealer_city') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Dealer City</label>
                <Input {...register('purchaseDealerCity')} />
                {renderFieldNote('purchase_dealer_city')}
              </div>
            ) : null}

            {requestedFieldNames.includes('purchase_dealer_address') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Dealer Address</label>
                <Textarea rows={2} {...register('purchaseDealerAddress')} />
                {renderFieldNote('purchase_dealer_address')}
              </div>
            ) : null}

            {requestedFieldNames.includes('postal_code') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Postal Code</label>
                <Input {...register('postalCode')} />
                {renderFieldNote('postal_code')}
              </div>
            ) : null}

            {requestedFieldNames.includes('paint_pairs') ? (
              <section className='space-y-2 rounded-xl border border-primary/15 p-3'>
                <h3 className='text-sm font-semibold text-text-primary'>{FIELD_LABELS.paint_pairs}</h3>
                {fields.map((field, index) => (
                  <div key={field.id} className='grid gap-2 rounded-lg border border-primary/10 p-2 md:grid-cols-2'>
                    <div>
                      <label className='text-xs font-medium text-text-muted'>Topcoat ID</label>
                      <Input {...register(`paintPairs.${index}.topcoatId`)} />
                      {errors.paintPairs?.[index]?.topcoatId ? (
                        <p className='mt-1 text-xs text-destructive'>{errors.paintPairs[index]?.topcoatId?.message}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className='text-xs font-medium text-text-muted'>Topcoat Quantity</label>
                      <Input {...register(`paintPairs.${index}.topcoatQuantity`)} />
                      {errors.paintPairs?.[index]?.topcoatQuantity ? (
                        <p className='mt-1 text-xs text-destructive'>
                          {errors.paintPairs[index]?.topcoatQuantity?.message}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label className='text-xs font-medium text-text-muted'>Basecoat ID (Optional)</label>
                      <Input {...register(`paintPairs.${index}.basecoatId`)} />
                    </div>
                    <div>
                      <label className='text-xs font-medium text-text-muted'>Basecoat Quantity (Optional)</label>
                      <Input {...register(`paintPairs.${index}.basecoatQuantity`)} />
                      {errors.paintPairs?.[index]?.basecoatQuantity ? (
                        <p className='mt-1 text-xs text-destructive'>
                          {errors.paintPairs[index]?.basecoatQuantity?.message}
                        </p>
                      ) : null}
                    </div>
                    <div className='md:col-span-2'>
                      <Button
                        type='button'
                        variant='outline'
                        className='h-8 rounded-lg border-primary/25 text-xs text-primary'
                        data-index={index}
                        onClick={handleRemovePaintPair}
                        disabled={fields.length === 1}
                      >
                        Remove Paint Pair
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type='button'
                  variant='outline'
                  className='h-8 rounded-lg border-primary/25 text-xs text-primary'
                  onClick={handleAddPaintPair}
                >
                  Add Paint Pair
                </Button>
                {renderFieldNote('paint_pairs')}
              </section>
            ) : null}

            {requestedFieldNames.includes('paint_pair_invoices') ? (
              <section className='space-y-2 rounded-xl border border-primary/15 p-3'>
                <h3 className='text-sm font-semibold text-text-primary'>{FIELD_LABELS.paint_pair_invoices}</h3>
                <p className='text-xs text-text-muted'>
                  Upload new invoice images to replace existing invoice photos. If you skip uploads, existing invoice
                  images remain unchanged.
                </p>
                <Controller
                  control={control}
                  name='invoiceFiles'
                  render={({ field }) => (
                    <Input
                      type='file'
                      accept='image/png,image/jpeg,image/jpg'
                      multiple
                      onChange={event => {
                        handleInvoiceFilesChange(field.onChange, event);
                      }}
                    />
                  )}
                />
                <p className='text-xs text-text-muted'>
                  Existing invoices: {registration.paintPairInvoices.length} ({REGISTRATION_INVOICE_TYPES.TOPCOAT}/
                  {REGISTRATION_INVOICE_TYPES.BASECOAT})
                </p>
                {renderFieldNote('paint_pair_invoices')}
              </section>
            ) : null}
          </div>

          <DialogFooter className='mt-3 border-t border-primary/10 pt-3'>
            <Button type='button' variant='outline' onClick={handleModalClose}>
              Cancel
            </Button>
            <Button
              type='submit'
              className='rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white hover:brightness-105'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
