import type { ChangeEvent, FocusEvent, JSX, MouseEvent } from 'react';
import { useEffect } from 'react';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui';
import { Input } from '#/components/ui/Input';
import { MANUAL_REGISTRATION_PROVINCE_OPTIONS, REGISTRATION_INVOICE_TYPES } from '#/constants';
import { useGetManualRegistrationProductsQuery } from '#/data-layer/registrations';
import { resubmitUpdateSchema, type ResubmitUpdateFormValues } from '#/schemas/registrations';
import type { ManualRegistrationProductOption } from '#/types/manualRegistration';
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

interface RequestedCorrectionNote {
  key: string;
  note: string;
  timestamp: string;
}

const getRequestedCorrectionNotes = (
  rejectionFields: RegistrationRejectionField[],
  requestedFieldNames: RegistrationRejectionField['fieldName'][]
): RequestedCorrectionNote[] => {
  const requestedFieldNameSet = new Set<RegistrationRejectionField['fieldName']>(requestedFieldNames);
  const uniqueNotes = new Map<string, RequestedCorrectionNote>();

  rejectionFields.forEach(field => {
    if (!requestedFieldNameSet.has(field.fieldName)) {
      return;
    }

    const normalizedNote = field.note?.trim() ?? '';
    if (!normalizedNote) {
      return;
    }

    const timestamp = formatNoteTimestamp(field.created);
    const noteKey = `${normalizedNote}::${timestamp}`;
    if (uniqueNotes.has(noteKey)) {
      return;
    }

    uniqueNotes.set(noteKey, {
      key: noteKey,
      note: normalizedNote,
      timestamp,
    });
  });

  return Array.from(uniqueNotes.values());
};

const getProductOptionLabel = (product: ManualRegistrationProductOption): string => {
  if (typeof product.warrantyYears === 'number' && product.warrantyYears > 0) {
    return `${product.label} (${product.warrantyYears} year warranty)`;
  }

  return product.label;
};

const mergeUniqueProductOptions = (
  primaryOptions: ManualRegistrationProductOption[],
  fallbackOptions: ManualRegistrationProductOption[]
): ManualRegistrationProductOption[] => {
  const optionMap = new Map<string, ManualRegistrationProductOption>();

  fallbackOptions.forEach(option => {
    optionMap.set(option.id, option);
  });

  primaryOptions.forEach(option => {
    optionMap.set(option.id, option);
  });

  return Array.from(optionMap.values());
};

const CITY_MAX_LENGTH = 80;
const DEALER_NAME_MAX_LENGTH = 120;
const DEALER_CITY_MAX_LENGTH = 80;
const DEALER_ADDRESS_MAX_LENGTH = 180;

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
  const manualProductsQuery = useGetManualRegistrationProductsQuery();
  const topcoatProducts = mergeUniqueProductOptions(
    manualProductsQuery.data?.topcoatProducts ?? [],
    registration.paintPairs.map(pair => ({
      id: String(pair.topcoat.id),
      label: pair.topcoat.name,
    }))
  );
  const requestedFieldNames = getRequestedFieldNames(registration.rejectionFields);
  const requestedCorrectionNotes = getRequestedCorrectionNotes(registration.rejectionFields, requestedFieldNames);
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
    getValues,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
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
  const watchedPaintPairs = watch('paintPairs') ?? [];
  const customerNameField = register('customerName');
  const phoneNumberField = register('phoneNumber');
  const emailField = register('email');
  const cityField = register('city');
  const siteAddressField = register('siteAddress');
  const purchaseDealerField = register('purchaseDealer');
  const purchaseDealerCityField = register('purchaseDealerCity');
  const purchaseDealerAddressField = register('purchaseDealerAddress');
  const postalCodeField = register('postalCode');

  useEffect(() => {
    const currentPhone = getValues('phoneNumber');
    if (!currentPhone) {
      setValue('phoneNumber', '92', { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
  }, [getValues, setValue]);

  const handleLettersOnlyChange = (event: ChangeEvent<HTMLInputElement>): void => {
    event.currentTarget.value = event.currentTarget.value.replace(/\d/g, '');
  };

  const handlePhoneNumberChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const digitsOnly = event.currentTarget.value.replace(/\D/g, '');
    const withoutPrefix = digitsOnly.startsWith('92') ? digitsOnly.slice(2) : digitsOnly;
    const normalizedLocalPart = withoutPrefix.startsWith('3') ? withoutPrefix : `3${withoutPrefix}`;
    const limitedLocalPart = normalizedLocalPart.slice(0, 10);
    event.currentTarget.value = `92${limitedLocalPart}`;
    phoneNumberField.onChange(event);
  };

  const handlePhoneNumberFocus = (event: FocusEvent<HTMLInputElement>): void => {
    if (!event.currentTarget.value) {
      event.currentTarget.value = '92';
      setValue('phoneNumber', '92', { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
  };

  const handleCityChange = (event: ChangeEvent<HTMLInputElement>): void => {
    handleLettersOnlyChange(event);
    cityField.onChange(event);
  };

  const handlePurchaseDealerChange = (event: ChangeEvent<HTMLInputElement>): void => {
    handleLettersOnlyChange(event);
    purchaseDealerField.onChange(event);
  };

  const handlePurchaseDealerCityChange = (event: ChangeEvent<HTMLInputElement>): void => {
    handleLettersOnlyChange(event);
    purchaseDealerCityField.onChange(event);
  };

  useEffect(() => {
    if (topcoatProducts.length === 0) {
      return;
    }

    watchedPaintPairs.forEach((paintPair, index) => {
      const selectedTopcoatId = paintPair.topcoatId.trim();
      const selectedBasecoatId = paintPair.basecoatId.trim();

      if (!selectedTopcoatId || !selectedBasecoatId) {
        return;
      }

      const matchedTopcoat = topcoatProducts.find(product => product.id === selectedTopcoatId);
      const linkedBasecoatOptions = mergeUniqueProductOptions(
        matchedTopcoat?.linkedBasecoats ?? [],
        registration.paintPairs
          .filter(pair => String(pair.topcoat.id) === selectedTopcoatId && pair.basecoat !== null)
          .map(pair => ({
            id: String(pair.basecoat?.id ?? ''),
            label: pair.basecoat?.name ?? '',
          }))
          .filter(option => option.id.length > 0 && option.label.length > 0)
      );
      const linkedBasecoatIds = new Set(linkedBasecoatOptions.map(basecoat => basecoat.id));
      if (!linkedBasecoatIds.has(selectedBasecoatId)) {
        setValue(`paintPairs.${index}.basecoatId`, '', { shouldValidate: true });
        setValue(`paintPairs.${index}.basecoatQuantity`, '', { shouldValidate: true });
      }
    });
  }, [registration.paintPairs, setValue, topcoatProducts, watchedPaintPairs]);

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
                <Input placeholder='e.g. Ahmed Raza' {...customerNameField} />
                {errors.customerName ? (
                  <p className='mt-1 text-xs text-destructive'>{errors.customerName.message}</p>
                ) : null}
              </div>
            ) : null}

            {requestedFieldNames.includes('phone_number') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Phone Number</label>
                <Input
                  placeholder='92XXXXXXXXXX'
                  {...phoneNumberField}
                  onChange={handlePhoneNumberChange}
                  onFocus={handlePhoneNumberFocus}
                />
                {errors.phoneNumber ? (
                  <p className='mt-1 text-xs text-destructive'>{errors.phoneNumber.message}</p>
                ) : null}
              </div>
            ) : null}

            {requestedFieldNames.includes('email') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Email</label>
                <Input type='email' placeholder='customer@example.com' {...emailField} />
                {errors.email ? <p className='mt-1 text-xs text-destructive'>{errors.email.message}</p> : null}
              </div>
            ) : null}

            {requestedFieldNames.includes('city') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>City</label>
                <Input
                  placeholder='e.g. Lahore'
                  maxLength={CITY_MAX_LENGTH}
                  {...cityField}
                  onChange={handleCityChange}
                />
              </div>
            ) : null}

            {requestedFieldNames.includes('province') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Province</label>
                <Controller
                  control={control}
                  name='province'
                  render={({ field: provinceField }) => (
                    <Select value={provinceField.value ?? ''} onValueChange={provinceField.onChange}>
                      <SelectTrigger aria-label='Select province'>
                        <SelectValue placeholder='Select province' />
                      </SelectTrigger>
                      <SelectContent>
                        {MANUAL_REGISTRATION_PROVINCE_OPTIONS.map(province => (
                          <SelectItem key={province} value={province}>
                            {province}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.province ? <p className='mt-1 text-xs text-destructive'>{errors.province.message}</p> : null}
              </div>
            ) : null}

            {requestedFieldNames.includes('site_address') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Site Address</label>
                <Input placeholder='Street, area, city' {...siteAddressField} />
              </div>
            ) : null}

            {requestedFieldNames.includes('purchase_date') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Purchase Date</label>
                <Input type='date' {...register('purchaseDate')} />
              </div>
            ) : null}

            {requestedFieldNames.includes('purchase_dealer') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Dealer Name</label>
                <Input
                  placeholder='e.g. Color World Traders'
                  maxLength={DEALER_NAME_MAX_LENGTH}
                  {...purchaseDealerField}
                  onChange={handlePurchaseDealerChange}
                />
              </div>
            ) : null}

            {requestedFieldNames.includes('purchase_dealer_city') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Dealer City</label>
                <Input
                  placeholder='e.g. Karachi'
                  maxLength={DEALER_CITY_MAX_LENGTH}
                  {...purchaseDealerCityField}
                  onChange={handlePurchaseDealerCityChange}
                />
              </div>
            ) : null}

            {requestedFieldNames.includes('purchase_dealer_address') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Dealer Address</label>
                <Input
                  placeholder='Street, area, city'
                  maxLength={DEALER_ADDRESS_MAX_LENGTH}
                  {...purchaseDealerAddressField}
                />
              </div>
            ) : null}

            {requestedFieldNames.includes('postal_code') ? (
              <div>
                <label className='text-sm font-medium text-text-primary'>Postal Code</label>
                <Input {...postalCodeField} />
              </div>
            ) : null}

            {requestedFieldNames.includes('paint_pairs') ? (
              <section className='space-y-2 rounded-xl border border-primary/15 p-3'>
                <h3 className='text-sm font-semibold text-text-primary'>{FIELD_LABELS.paint_pairs}</h3>
                {fields.map((field, index) => (
                  <div key={field.id} className='grid gap-2 rounded-lg border border-primary/10 p-2 md:grid-cols-2'>
                    <div>
                      <label className='text-xs font-medium text-text-muted'>Topcoat</label>
                      <Controller
                        control={control}
                        name={`paintPairs.${index}.topcoatId`}
                        render={({ field: paintPairField }) => (
                          <Select
                            value={paintPairField.value}
                            onValueChange={paintPairField.onChange}
                            disabled={manualProductsQuery.isLoading}
                          >
                            <SelectTrigger aria-label='Select topcoat product'>
                              <SelectValue placeholder='Select topcoat product' />
                            </SelectTrigger>
                            <SelectContent>
                              {topcoatProducts.map(product => (
                                <SelectItem key={product.id} value={product.id}>
                                  {getProductOptionLabel(product)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {manualProductsQuery.isError ? (
                        <p className='mt-1 text-xs text-destructive'>
                          {manualProductsQuery.error?.message ?? 'Unable to load topcoat products.'}
                        </p>
                      ) : null}
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
                      <label className='text-xs font-medium text-text-muted'>Basecoat (Optional)</label>
                      <Controller
                        control={control}
                        name={`paintPairs.${index}.basecoatId`}
                        render={({ field: paintPairField }) => {
                          const selectedTopcoatId = watchedPaintPairs[index]?.topcoatId?.trim() ?? '';
                          const selectedTopcoat = topcoatProducts.find(product => product.id === selectedTopcoatId);
                          const basecoatOptions = mergeUniqueProductOptions(
                            selectedTopcoat?.linkedBasecoats ?? [],
                            registration.paintPairs
                              .filter(pair => String(pair.topcoat.id) === selectedTopcoatId && pair.basecoat !== null)
                              .map(pair => ({
                                id: String(pair.basecoat?.id ?? ''),
                                label: pair.basecoat?.name ?? '',
                              }))
                              .filter(option => option.id.length > 0 && option.label.length > 0)
                          );

                          return (
                            <Select
                              value={paintPairField.value}
                              onValueChange={paintPairField.onChange}
                              disabled={manualProductsQuery.isLoading || !selectedTopcoatId}
                            >
                              <SelectTrigger aria-label='Select basecoat product'>
                                <SelectValue placeholder='Select basecoat product' />
                              </SelectTrigger>
                              <SelectContent>
                                {!selectedTopcoatId ? (
                                  <SelectItem value={`__select_topcoat_first__${index}`} disabled>
                                    Select a topcoat first
                                  </SelectItem>
                                ) : basecoatOptions.length > 0 ? (
                                  basecoatOptions.map(product => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {getProductOptionLabel(product)}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value={`__no_basecoat_available__${index}`} disabled>
                                    No basecoat available for selected topcoat
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          );
                        }}
                      />
                      {errors.paintPairs?.[index]?.basecoatId ? (
                        <p className='mt-1 text-xs text-destructive'>{errors.paintPairs[index]?.basecoatId?.message}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className='text-xs font-medium text-text-muted'>Basecoat Quantity (Optional)</label>
                      <Input
                        {...register(`paintPairs.${index}.basecoatQuantity`)}
                        disabled={!watchedPaintPairs[index]?.basecoatId}
                      />
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
              </section>
            ) : null}

            {requestedCorrectionNotes.length > 0 ? (
              <section className='space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3'>
                <div className='flex items-center gap-2'>
                  <Info className='h-4 w-4 shrink-0 text-warning' />
                  <h3 className='text-sm font-semibold text-warning'>Requested Correction Notes</h3>
                </div>
                {requestedCorrectionNotes.map(noteItem => (
                  <div key={noteItem.key} className='rounded-md border border-warning/30 bg-white/60 p-2'>
                    <p className='text-xs leading-5 text-text-primary'>{noteItem.note}</p>
                    {noteItem.timestamp ? (
                      <p className='mt-1 text-[11px] text-text-muted'>Added: {noteItem.timestamp}</p>
                    ) : null}
                  </div>
                ))}
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
