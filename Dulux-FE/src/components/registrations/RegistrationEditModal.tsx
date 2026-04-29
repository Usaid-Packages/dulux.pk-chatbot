import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent, JSX, MouseEvent as ReactMouseEvent } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO, subDays } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui';
import { Calendar } from '#/components/ui/Calendar';
import { MANUAL_REGISTRATION_ALLOWED_FILE_TYPES, MANUAL_REGISTRATION_MAX_FILE_SIZE_BYTES } from '#/constants';
import { REGISTRATION_PRODUCT_TYPES } from '#/constants/registrations';
import { useGetManualRegistrationProductsQuery } from '#/data-layer/registrations';
import { registrationEditSchema, type RegistrationEditFormValues } from '#/schemas/registrations';
import type { ManualRegistrationProductOption } from '#/types/manualRegistration';
import type { RegistrationDetail } from '#/types/registrations';

interface RegistrationEditModalProps {
  isOpen: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  registration: RegistrationDetail | null;
  onClose: () => void;
  onSubmit: (values: RegistrationEditFormValues) => void;
}

const DATE_FORMAT = 'yyyy-MM-dd';
const PURCHASE_DATE_RANGE_DAYS = 60;
const CITY_MAX_LENGTH = 80;
const DEALER_NAME_MAX_LENGTH = 120;
const DEALER_CITY_MAX_LENGTH = 80;
const DEALER_ADDRESS_MAX_LENGTH = 180;
const NO_BASECOAT_VALUE = '__none__';
const EDIT_MODAL_BODY_MIN_HEIGHT_CLASS = 'min-h-[620px]';

const parsePurchaseDate = (value: string): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const parsedDate = parseISO(value);
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
};

const formatPurchaseDate = (value: Date | undefined): string => {
  if (!value) {
    return '';
  }

  return format(value, DATE_FORMAT);
};

const getProductOptionLabel = (product: ManualRegistrationProductOption): string => {
  if (typeof product.warrantyYears === 'number' && product.warrantyYears > 0) {
    return `${product.label} (${product.warrantyYears} year warranty)`;
  }

  return product.label;
};

const isSpecialistProduct = (product: ManualRegistrationProductOption | undefined): boolean => {
  return product?.productType === REGISTRATION_PRODUCT_TYPES.SPECIALIST;
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

const DEFAULT_PAINT_PAIR = {
  selectionType: '',
  topcoatId: '',
  topcoatQuantity: '',
  basecoatId: '',
  basecoatQuantity: '',
};

const EMPTY_EDIT_VALUES: RegistrationEditFormValues = {
  customerName: '',
  phoneNumber: '92',
  email: '',
  city: '',
  siteAddress: '',
  purchaseDate: '',
  purchaseDealer: '',
  purchaseDealerCity: '',
  purchaseDealerAddress: '',
  paintPairs: [DEFAULT_PAINT_PAIR],
  existingInvoiceImageIds: [],
  invoiceFiles: [],
};

/**
 * RegistrationEditModal renders editable registration fields in a prefilled modal.
 *
 * @param props - Modal state, selected registration detail, and submit handlers.
 * @returns Registration edit modal component.
 */
export const RegistrationEditModal = ({
  isOpen,
  isLoading,
  isSubmitting,
  registration,
  onClose,
  onSubmit,
}: RegistrationEditModalProps): JSX.Element => {
  const {
    control,
    register,
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationEditFormValues>({
    resolver: zodResolver(registrationEditSchema),
    defaultValues: EMPTY_EDIT_VALUES,
  });
  const phoneNumberField = register('phoneNumber');
  const customerNameField = register('customerName');
  const cityField = register('city');
  const purchaseDealerField = register('purchaseDealer');
  const purchaseDealerCityField = register('purchaseDealerCity');
  const purchaseDateField = register('purchaseDate');
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const calendarWrapperRef = useRef<HTMLDivElement | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const earliestAllowedDate = subDays(today, PURCHASE_DATE_RANGE_DAYS - 1);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'paintPairs',
  });
  const watchedPaintPairs = watch('paintPairs') ?? [];
  const selectedTopcoatIds = useMemo(() => {
    return watchedPaintPairs.map(paintPair => paintPair.topcoatId.trim()).filter(topcoatId => topcoatId.length > 0);
  }, [watchedPaintPairs]);
  const manualProductsQuery = useGetManualRegistrationProductsQuery({
    enabled: isOpen && Boolean(registration),
    basecoatTopcoatIds: selectedTopcoatIds,
  });
  const topcoatProducts = mergeUniqueProductOptions(
    manualProductsQuery.data?.topcoatProducts ?? [],
    (registration?.paintPairs ?? []).map(pair => ({
      id: String(pair.topcoat.id),
      label: pair.topcoat.name,
      productType: pair.topcoat.productType,
    }))
  );
  const selectedInvoiceFiles = watch('invoiceFiles');
  const specialistPairs = (registration?.paintPairs ?? []).filter(pair => pair.topcoat.productType === 'SPECIALIST');
  const topcoatPairs = (registration?.paintPairs ?? []).filter(pair => pair.topcoat.productType !== 'SPECIALIST');

  useEffect(() => {
    if (!isCalendarOpen) {
      return;
    }

    const handleOutsidePointerDown = (event: MouseEvent): void => {
      if (calendarWrapperRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsCalendarOpen(false);
    };

    window.addEventListener('mousedown', handleOutsidePointerDown);
    window.addEventListener('touchstart', handleOutsidePointerDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsidePointerDown);
      window.removeEventListener('touchstart', handleOutsidePointerDown);
    };
  }, [isCalendarOpen]);

  useEffect(() => {
    if (!isOpen || !registration) {
      return;
    }

    reset({
      customerName: registration.customerName,
      phoneNumber: registration.phoneNumber,
      email: registration.email,
      city: registration.city,
      siteAddress: registration.siteAddress,
      purchaseDate: registration.purchaseDate,
      purchaseDealer: registration.purchaseDealer,
      purchaseDealerCity: registration.purchaseDealerCity,
      purchaseDealerAddress: registration.purchaseDealerAddress,
      // Keep edit input section empty; existing pairs are shown in read-only tables above.
      paintPairs: [{ ...DEFAULT_PAINT_PAIR }],
      existingInvoiceImageIds: registration.paintPairInvoices.map(invoice => invoice.image.id),
      invoiceFiles: [],
    });
  }, [isOpen, registration, reset]);

  useEffect(() => {
    if (topcoatProducts.length === 0 || !registration) {
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
        setValue(`paintPairs.${index}.basecoatId`, '');
        setValue(`paintPairs.${index}.basecoatQuantity`, '');
      }
    });
  }, [registration, setValue, topcoatProducts, watchedPaintPairs]);

  const handleModalClose = (): void => {
    setIsCalendarOpen(false);
    onClose();
  };

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      handleModalClose();
    }
  };

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

  const handleCustomerNameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    handleLettersOnlyChange(event);
    customerNameField.onChange(event);
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

  const handleTopcoatChange = (index: number, value: string): void => {
    setValue(`paintPairs.${index}.topcoatId`, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setValue(`paintPairs.${index}.basecoatId`, '', { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setValue(`paintPairs.${index}.basecoatQuantity`, '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleSelectionTypeChange = (index: number, selectionType: 'SPECIALIST' | 'TOPCOAT'): void => {
    setValue(`paintPairs.${index}.selectionType`, selectionType, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
    setValue(`paintPairs.${index}.topcoatId`, '', { shouldDirty: true, shouldTouch: true, shouldValidate: false });
    setValue(`paintPairs.${index}.topcoatQuantity`, '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
    setValue(`paintPairs.${index}.basecoatId`, '', { shouldDirty: true, shouldTouch: true, shouldValidate: false });
    setValue(`paintPairs.${index}.basecoatQuantity`, '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  };

  const handleAddPaintPair = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    append({ ...DEFAULT_PAINT_PAIR });
  };

  const handleRemovePaintPair = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    const indexValue = event.currentTarget.dataset.index;
    if (!indexValue) {
      return;
    }

    const index = Number.parseInt(indexValue, 10);
    if (!Number.isFinite(index) || fields.length <= 1) {
      return;
    }

    remove(index);
  };

  const handleInvoiceFilesChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? []).filter(
      file =>
        file.size <= MANUAL_REGISTRATION_MAX_FILE_SIZE_BYTES &&
        MANUAL_REGISTRATION_ALLOWED_FILE_TYPES.includes(
          file.type as (typeof MANUAL_REGISTRATION_ALLOWED_FILE_TYPES)[number]
        )
    );
    setValue('invoiceFiles', files, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  const handleRemoveExistingInvoice = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    const imageIdValue = event.currentTarget.dataset.imageId;
    if (!imageIdValue) {
      return;
    }

    const imageId = Number.parseInt(imageIdValue, 10);
    if (!Number.isFinite(imageId)) {
      return;
    }

    const currentImageIds = watch('existingInvoiceImageIds');
    const nextImageIds = currentImageIds.filter(existingImageId => existingImageId !== imageId);
    setValue('existingInvoiceImageIds', nextImageIds, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  const renderLoadingState = (): JSX.Element => {
    return (
      <div className={`${EDIT_MODAL_BODY_MIN_HEIGHT_CLASS} flex items-center`}>
        <p className='rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-text-primary'>
          Loading registration details...
        </p>
      </div>
    );
  };

  const renderMissingDataState = (): JSX.Element => {
    return (
      <div className={`${EDIT_MODAL_BODY_MIN_HEIGHT_CLASS} flex items-center`}>
        <p className='rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive'>
          Unable to load selected registration for editing.
        </p>
      </div>
    );
  };

  const renderForm = (): JSX.Element => {
    const selectedDate = parsePurchaseDate(watch('purchaseDate'));
    const existingInvoiceImageIds = watch('existingInvoiceImageIds');
    const visibleExistingInvoices = (registration?.paintPairInvoices ?? []).filter(invoice =>
      existingInvoiceImageIds.includes(invoice.image.id)
    );

    return (
      <form className={`${EDIT_MODAL_BODY_MIN_HEIGHT_CLASS} space-y-4`} onSubmit={handleSubmit(onSubmit)}>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <label htmlFor='registration-edit-customer-name' className='text-sm font-medium text-text-primary'>
              Customer Name <span className='text-destructive'>*</span>
            </label>
            <Input
              id='registration-edit-customer-name'
              className='rounded-xl border-primary/20 bg-white'
              {...customerNameField}
              onChange={handleCustomerNameChange}
              aria-invalid={Boolean(errors.customerName)}
            />
            {errors.customerName ? <p className='text-xs text-destructive'>{errors.customerName.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='registration-edit-phone-number' className='text-sm font-medium text-text-primary'>
              Phone Number <span className='text-destructive'>*</span>
            </label>
            <Input
              id='registration-edit-phone-number'
              className='rounded-xl border-primary/20 bg-white'
              {...phoneNumberField}
              onChange={handlePhoneNumberChange}
              onFocus={handlePhoneNumberFocus}
              aria-invalid={Boolean(errors.phoneNumber)}
            />
            {errors.phoneNumber ? <p className='text-xs text-destructive'>{errors.phoneNumber.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='registration-edit-email' className='text-sm font-medium text-text-primary'>
              Email <span className='text-destructive'>*</span>
            </label>
            <Input
              id='registration-edit-email'
              type='email'
              className='rounded-xl border-primary/20 bg-white'
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? <p className='text-xs text-destructive'>{errors.email.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='registration-edit-city' className='text-sm font-medium text-text-primary'>
              City <span className='text-destructive'>*</span>
            </label>
            <Input
              id='registration-edit-city'
              className='rounded-xl border-primary/20 bg-white'
              maxLength={CITY_MAX_LENGTH}
              {...cityField}
              onChange={handleCityChange}
              aria-invalid={Boolean(errors.city)}
            />
            {errors.city ? <p className='text-xs text-destructive'>{errors.city.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='registration-edit-purchase-date' className='text-sm font-medium text-text-primary'>
              Purchase Date <span className='text-destructive'>*</span>
            </label>
            <Controller
              control={control}
              name='purchaseDate'
              render={({ field }) => {
                const handleOpenCalendar = (): void => {
                  setIsCalendarOpen(true);
                };

                const handleToggleCalendar = (): void => {
                  setIsCalendarOpen(previous => !previous);
                };

                const handleSelectDate = (date: Date | undefined): void => {
                  field.onChange(formatPurchaseDate(date));
                  setIsCalendarOpen(false);
                };

                return (
                  <div className='relative space-y-2' ref={calendarWrapperRef}>
                    <div className='relative'>
                      <Input
                        id='registration-edit-purchase-date'
                        readOnly
                        value={field.value}
                        placeholder='Select purchase date'
                        className='cursor-pointer rounded-xl border-primary/20 bg-white px-3 py-2.5 pr-11'
                        onClick={handleOpenCalendar}
                        onFocus={handleOpenCalendar}
                        onBlur={purchaseDateField.onBlur}
                        aria-invalid={Boolean(errors.purchaseDate)}
                      />
                      <button
                        type='button'
                        aria-label='Toggle purchase date calendar'
                        onClick={handleToggleCalendar}
                        className='absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md border border-border-strong bg-white text-text-muted shadow-sm transition-colors hover:bg-surface-subtle hover:text-text-primary'
                      >
                        <CalendarDays aria-hidden='true' className='h-4 w-4' />
                      </button>
                    </div>
                    {isCalendarOpen ? (
                      <div
                        role='dialog'
                        aria-label='Purchase date calendar'
                        className='absolute right-0 z-20 mt-2 rounded-2xl border border-primary/25 bg-white p-2.5 shadow-[0_16px_36px_rgba(15,23,42,0.2)] ring-1 ring-primary/10'
                      >
                        <Calendar
                          mode='single'
                          selected={selectedDate}
                          onSelect={handleSelectDate}
                          disabled={date => date > today || date < earliestAllowedDate}
                          className='rounded-xl bg-white p-3 [--cell-size:2.75rem]'
                          classNames={{
                            nav: 'absolute inset-x-0 top-0 flex w-full items-center justify-between px-3 pt-1.5',
                            button_previous:
                              'h-[--cell-size] w-[--cell-size] rounded-lg border border-border-strong bg-white p-0 text-primary shadow-sm hover:bg-primary/5',
                            button_next:
                              'h-[--cell-size] w-[--cell-size] rounded-lg border border-border-strong bg-white p-0 text-primary shadow-sm hover:bg-primary/5',
                            month_caption:
                              'flex h-[--cell-size] w-full items-center justify-center px-[calc(var(--cell-size)+0.8rem)] pb-2 text-sm font-bold text-text-primary',
                            weekdays: 'mb-2.5 flex gap-2.5',
                            week: 'mt-2.5 flex w-full gap-2.5',
                            weekday:
                              'flex-1 text-center text-[0.75rem] font-semibold uppercase tracking-[0.02em] text-text-muted',
                            day: 'relative flex-1 aspect-square h-full w-full select-none p-0 text-center',
                            day_button:
                              'h-full w-full rounded-lg text-sm font-medium text-text-primary hover:bg-primary/10 data-[selected-single=true]:bg-primary data-[selected-single=true]:text-white',
                            outside: 'text-slate-400 opacity-70',
                            disabled: 'text-slate-300 opacity-50',
                            today:
                              'rounded-lg border border-primary/45 bg-primary/10 text-primary data-[selected-single=true]:border-primary data-[selected-single=true]:bg-primary data-[selected-single=true]:text-white',
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              }}
            />
            {errors.purchaseDate ? <p className='text-xs text-destructive'>{errors.purchaseDate.message}</p> : null}
          </div>

          <div className='space-y-2 md:col-span-2'>
            <label htmlFor='registration-edit-site-address' className='text-sm font-medium text-text-primary'>
              Site Address <span className='text-destructive'>*</span>
            </label>
            <Input
              id='registration-edit-site-address'
              className='rounded-xl border-primary/20 bg-white'
              {...register('siteAddress')}
              aria-invalid={Boolean(errors.siteAddress)}
            />
            {errors.siteAddress ? <p className='text-xs text-destructive'>{errors.siteAddress.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='registration-edit-purchase-dealer' className='text-sm font-medium text-text-primary'>
              Dealer Name <span className='text-destructive'>*</span>
            </label>
            <Input
              id='registration-edit-purchase-dealer'
              className='rounded-xl border-primary/20 bg-white'
              maxLength={DEALER_NAME_MAX_LENGTH}
              {...purchaseDealerField}
              onChange={handlePurchaseDealerChange}
              aria-invalid={Boolean(errors.purchaseDealer)}
            />
            {errors.purchaseDealer ? <p className='text-xs text-destructive'>{errors.purchaseDealer.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='registration-edit-purchase-dealer-city' className='text-sm font-medium text-text-primary'>
              Dealer City <span className='text-destructive'>*</span>
            </label>
            <Input
              id='registration-edit-purchase-dealer-city'
              className='rounded-xl border-primary/20 bg-white'
              maxLength={DEALER_CITY_MAX_LENGTH}
              {...purchaseDealerCityField}
              onChange={handlePurchaseDealerCityChange}
              aria-invalid={Boolean(errors.purchaseDealerCity)}
            />
            {errors.purchaseDealerCity ? (
              <p className='text-xs text-destructive'>{errors.purchaseDealerCity.message}</p>
            ) : null}
          </div>

          <div className='space-y-2 md:col-span-2'>
            <label
              htmlFor='registration-edit-purchase-dealer-address'
              className='text-sm font-medium text-text-primary'
            >
              Dealer Address <span className='text-destructive'>*</span>
            </label>
            <Input
              id='registration-edit-purchase-dealer-address'
              className='rounded-xl border-primary/20 bg-white'
              maxLength={DEALER_ADDRESS_MAX_LENGTH}
              {...register('purchaseDealerAddress')}
              aria-invalid={Boolean(errors.purchaseDealerAddress)}
            />
            {errors.purchaseDealerAddress ? (
              <p className='text-xs text-destructive'>{errors.purchaseDealerAddress.message}</p>
            ) : null}
          </div>
        </div>

        <div className='space-y-3 rounded-xl border border-primary/15 bg-surface p-3'>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-sm font-semibold text-text-primary'>
              Paint Pair Details <span className='text-destructive'>*</span>
            </p>
            <Button type='button' variant='outline' size='sm' onClick={handleAddPaintPair}>
              Add Pair
            </Button>
          </div>

          {specialistPairs.length > 0 ? (
            <div className='overflow-x-auto rounded-lg border border-primary/10 bg-white p-2'>
              <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted'>Specialized Paint</p>
              <table className='min-w-full text-sm'>
                <thead>
                  <tr className='border-b border-border text-left text-text-muted'>
                    <th className='py-2'>Selection Type</th>
                    <th className='py-2'>Specialized</th>
                    <th className='py-2'>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {specialistPairs.map(pair => (
                    <tr key={pair.id} className='border-b border-border/60 last:border-b-0'>
                      <td className='py-2'>Specialized</td>
                      <td className='py-2'>{pair.topcoat.name}</td>
                      <td className='py-2'>{pair.topcoatQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {topcoatPairs.length > 0 ? (
            <div className='overflow-x-auto rounded-lg border border-primary/10 bg-white p-2'>
              <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted'>Topcoat + Basecoat</p>
              <table className='min-w-full text-sm'>
                <thead>
                  <tr className='border-b border-border text-left text-text-muted'>
                    <th className='py-2'>Selection Type</th>
                    <th className='py-2'>Topcoat</th>
                    <th className='py-2'>Quantity</th>
                    <th className='py-2'>Basecoat</th>
                    <th className='py-2'>Basecoat Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {topcoatPairs.map(pair => (
                    <tr key={pair.id} className='border-b border-border/60 last:border-b-0'>
                      <td className='py-2'>Topcoat + Basecoat</td>
                      <td className='py-2'>{pair.topcoat.name}</td>
                      <td className='py-2'>{pair.topcoatQuantity}</td>
                      <td className='py-2'>{pair.basecoat?.name ?? 'N/A'}</td>
                      <td className='py-2'>{pair.basecoatQuantity ?? 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>Update Paint Pairs</p>

          <div className='max-h-[24rem] space-y-3 overflow-y-auto pr-1'>
            {fields.map((field, index) => {
              const selectedTopcoatId = watchedPaintPairs[index]?.topcoatId ?? '';
              const selectionType = watchedPaintPairs[index]?.selectionType ?? '';
              const selectedTopcoat = topcoatProducts.find(product => product.id === selectedTopcoatId);
              const registrationBasecoatFallback = (registration?.paintPairs ?? [])
                .filter(pair => String(pair.topcoat.id) === selectedTopcoatId && pair.basecoat !== null)
                .map(pair => ({
                  id: String(pair.basecoat?.id ?? ''),
                  label: pair.basecoat?.name ?? '',
                }))
                .filter(option => option.id.length > 0 && option.label.length > 0);
              const availableBasecoats = mergeUniqueProductOptions(
                selectedTopcoat?.linkedBasecoats ?? [],
                registrationBasecoatFallback
              );
              const isSpecialistTopcoatSelected = isSpecialistProduct(selectedTopcoat);
              const filteredTopcoatProducts = topcoatProducts.filter(product => {
                if (selectionType === 'SPECIALIST') {
                  return product.productType === REGISTRATION_PRODUCT_TYPES.SPECIALIST;
                }
                if (selectionType === 'TOPCOAT') {
                  return product.productType === REGISTRATION_PRODUCT_TYPES.TOPCOAT;
                }
                return false;
              });
              const paintPairError = errors.paintPairs?.[index];

              return (
                <article key={field.id} className='space-y-3 rounded-xl border border-primary/15 bg-white p-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='text-xs font-semibold uppercase tracking-[0.2px] text-text-muted'>
                      Paint Pair {index + 1}
                    </p>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      data-index={index}
                      onClick={handleRemovePaintPair}
                      disabled={fields.length <= 1}
                      className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                    >
                      Remove
                    </Button>
                  </div>

                  <div className='space-y-2'>
                    <label className='text-xs font-semibold text-text-muted'>Choose Paint Type</label>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        type='button'
                        variant={selectionType === 'SPECIALIST' ? 'default' : 'outline'}
                        onClick={() => handleSelectionTypeChange(index, 'SPECIALIST')}
                      >
                        Specialized Coat
                      </Button>
                      <Button
                        type='button'
                        variant={selectionType === 'TOPCOAT' ? 'default' : 'outline'}
                        onClick={() => handleSelectionTypeChange(index, 'TOPCOAT')}
                      >
                        Topcoat + Basecoat
                      </Button>
                    </div>
                    {paintPairError?.selectionType ? (
                      <p className='text-xs text-destructive'>{paintPairError.selectionType.message}</p>
                    ) : null}
                  </div>

                  {selectionType ? (
                    <div className='grid gap-3 md:grid-cols-2'>
                      <div className='space-y-1'>
                        <label className='text-xs font-semibold text-text-muted'>
                          {selectionType === 'SPECIALIST' ? 'Specialist Product' : 'Topcoat'}
                        </label>
                        <Controller
                          control={control}
                          name={`paintPairs.${index}.topcoatId`}
                          render={({ field: topcoatField }) => (
                            <Select
                              value={topcoatField.value}
                              onValueChange={value => handleTopcoatChange(index, value)}
                            >
                              <SelectTrigger
                                aria-label='Select topcoat product'
                                className='rounded-xl border-primary/20 bg-white'
                              >
                                <SelectValue
                                  placeholder={
                                    selectionType === 'SPECIALIST' ? 'Select specialist product' : 'Select topcoat'
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredTopcoatProducts.map(product => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {getProductOptionLabel(product)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {paintPairError?.topcoatId ? (
                          <p className='text-xs text-destructive'>{paintPairError.topcoatId.message}</p>
                        ) : null}
                      </div>

                      <div className='space-y-1'>
                        <label className='text-xs font-semibold text-text-muted'>
                          {selectionType === 'SPECIALIST'
                            ? 'Specialist Quantity (liters)'
                            : 'Topcoat Quantity (liters)'}
                        </label>
                        <Input
                          className='rounded-xl border-primary/20 bg-white'
                          placeholder='e.g. 10'
                          {...register(`paintPairs.${index}.topcoatQuantity`)}
                          aria-invalid={Boolean(paintPairError?.topcoatQuantity)}
                        />
                        {paintPairError?.topcoatQuantity ? (
                          <p className='text-xs text-destructive'>{paintPairError.topcoatQuantity.message}</p>
                        ) : null}
                      </div>

                      {selectionType === 'TOPCOAT' ? (
                        <div className='space-y-1'>
                          <label className='text-xs font-semibold text-text-muted'>Basecoat (optional)</label>
                          <Controller
                            control={control}
                            name={`paintPairs.${index}.basecoatId`}
                            render={({ field: basecoatField }) => (
                              <Select
                                value={basecoatField.value || NO_BASECOAT_VALUE}
                                onValueChange={value => {
                                  const normalizedValue = value === NO_BASECOAT_VALUE ? '' : value;
                                  basecoatField.onChange(normalizedValue);
                                  if (!normalizedValue) {
                                    setValue(`paintPairs.${index}.basecoatQuantity`, '', {
                                      shouldDirty: true,
                                      shouldTouch: true,
                                      shouldValidate: true,
                                    });
                                  }
                                }}
                                disabled={isSpecialistTopcoatSelected || !selectedTopcoatId}
                              >
                                <SelectTrigger
                                  aria-label='Select basecoat product'
                                  className='rounded-xl border-primary/20 bg-white'
                                >
                                  <SelectValue placeholder='Select basecoat' />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NO_BASECOAT_VALUE}>No basecoat</SelectItem>
                                  {availableBasecoats.map(product => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {getProductOptionLabel(product)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {paintPairError?.basecoatId ? (
                            <p className='text-xs text-destructive'>{paintPairError.basecoatId.message}</p>
                          ) : null}
                        </div>
                      ) : null}

                      {selectionType === 'TOPCOAT' ? (
                        <div className='space-y-1'>
                          <label className='text-xs font-semibold text-text-muted'>Basecoat Qty</label>
                          <Input
                            className='rounded-xl border-primary/20 bg-white'
                            placeholder='e.g. 5'
                            {...register(`paintPairs.${index}.basecoatQuantity`)}
                            disabled={isSpecialistTopcoatSelected}
                            aria-invalid={Boolean(paintPairError?.basecoatQuantity)}
                          />
                          {paintPairError?.basecoatQuantity ? (
                            <p className='text-xs text-destructive'>{paintPairError.basecoatQuantity.message}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {errors.paintPairs?.message ? <p className='text-xs text-destructive'>{errors.paintPairs.message}</p> : null}
        </div>

        <div className='space-y-2 rounded-xl border border-primary/15 bg-surface p-3'>
          <p className='text-sm font-medium text-text-primary'>
            Current Invoice Images <span className='text-destructive'>*</span>
          </p>
          <p className='text-xs text-text-muted'>Click any image to remove it from this registration.</p>
          {visibleExistingInvoices.length > 0 ? (
            <div className='grid gap-2 sm:grid-cols-2'>
              {visibleExistingInvoices.map(invoice => (
                <button
                  key={invoice.id}
                  type='button'
                  data-image-id={String(invoice.image.id)}
                  onClick={handleRemoveExistingInvoice}
                  className='group relative overflow-hidden rounded-lg border border-primary/20 bg-white text-left'
                  title='Click to remove image'
                >
                  <div className='flex h-44 items-center justify-center bg-slate-50 p-2'>
                    <img
                      src={invoice.image.image}
                      alt='Registration invoice'
                      className='h-full w-full object-contain'
                    />
                  </div>
                  <span className='absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-xs text-white'>
                    Click to remove
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className='text-xs text-text-muted'>No current images selected.</p>
          )}

          <label htmlFor='registration-edit-invoices' className='text-sm font-medium text-text-primary'>
            Upload New Invoice Images
          </label>
          <Input
            id='registration-edit-invoices'
            type='file'
            className='rounded-xl border-primary/20 bg-white file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-primary'
            multiple
            accept='.jpg,.jpeg,.png'
            onChange={handleInvoiceFilesChange}
          />
          <p className='text-xs text-text-muted'>Upload clear invoice images (JPG or PNG). Max size: 5MB each.</p>
          {selectedInvoiceFiles.length > 0 ? (
            <ul className='flex flex-col gap-1'>
              {selectedInvoiceFiles.map(file => (
                <li key={file.name}>
                  <span className='inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-text-primary'>
                    {file.name}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {errors.existingInvoiceImageIds?.message ? (
            <p className='text-xs text-destructive'>{errors.existingInvoiceImageIds.message}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={handleModalClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type='submit' variant='primaryGradient' className='rounded-xl' disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </form>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='max-h-[88vh] overflow-x-hidden overflow-y-auto border-primary/20 bg-white sm:max-w-[860px]'>
        <DialogHeader>
          <DialogTitle>Edit Registration</DialogTitle>
          <DialogDescription>Edit registration details and paint pairs before approval.</DialogDescription>
        </DialogHeader>

        {isLoading ? renderLoadingState() : null}
        {!isLoading && !registration ? renderMissingDataState() : null}
        {!isLoading && registration ? renderForm() : null}
      </DialogContent>
    </Dialog>
  );
};
