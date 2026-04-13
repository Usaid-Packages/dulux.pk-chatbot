import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, JSX } from 'react';

import { format, parseISO, subDays } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';

import { Input, Textarea } from '#/components/ui';
import { Calendar } from '#/components/ui/Calendar';
import { NOTES_MAX_LENGTH } from '#/constants';
import type { ManualRegistrationFormValues } from '#/types/manualRegistration';

const DATE_FORMAT = 'yyyy-MM-dd';
const PURCHASE_DATE_RANGE_DAYS = 60;
const DEALER_NAME_MAX_LENGTH = 120;
const DEALER_CITY_MAX_LENGTH = 80;
const DEALER_ADDRESS_MAX_LENGTH = 180;

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

const handleLettersOnlyChange = (event: ChangeEvent<HTMLInputElement>): void => {
  event.currentTarget.value = event.currentTarget.value.replace(/\d/g, '');
};

/**
 * PurchaseDealerStep renders purchase metadata and dealer information for step 2.
 *
 * @returns Purchase and dealer step section.
 */
export const PurchaseDealerStep = (): JSX.Element => {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ManualRegistrationFormValues>();
  const purchaseDateField = register('purchaseDate');
  const purchaseDealerField = register('purchaseDealer');
  const purchaseDealerCityField = register('purchaseDealerCity');
  const purchaseDealerAddressField = register('purchaseDealerAddress');
  const notesField = register('notes');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarWrapperRef = useRef<HTMLDivElement | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const earliestAllowedDate = subDays(today, PURCHASE_DATE_RANGE_DAYS - 1);

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

  const handlePurchaseDealerChange = (event: ChangeEvent<HTMLInputElement>): void => {
    handleLettersOnlyChange(event);
    purchaseDealerField.onChange(event);
  };

  const handlePurchaseDealerCityChange = (event: ChangeEvent<HTMLInputElement>): void => {
    handleLettersOnlyChange(event);
    purchaseDealerCityField.onChange(event);
  };

  return (
    <section className='space-y-4 wf-card wf-card-p5'>
      <header>
        <h3 className='text-lg font-semibold text-text-primary'>Purchase & Dealer</h3>
        <p className='text-sm text-text-muted'>Capture where and when paint products were purchased.</p>
      </header>

      <div className='grid gap-4 md:grid-cols-2'>
        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>
            Purchase Date <span className='text-destructive'>*</span>
          </span>
          <Controller
            name='purchaseDate'
            control={control}
            render={({ field }) => {
              const selectedDate = parsePurchaseDate(field.value);
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
                      id='purchaseDate'
                      readOnly
                      value={field.value}
                      placeholder='Select purchase date'
                      className='cursor-pointer px-3 py-2.5 pr-11'
                      onClick={handleOpenCalendar}
                      onFocus={handleOpenCalendar}
                      onBlur={purchaseDateField.onBlur}
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
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>
            Dealer Name <span className='text-destructive'>*</span>
          </span>
          <Input
            placeholder='e.g. Color World Traders'
            maxLength={DEALER_NAME_MAX_LENGTH}
            {...purchaseDealerField}
            onChange={handlePurchaseDealerChange}
          />
          {errors.purchaseDealer ? <p className='text-xs text-destructive'>{errors.purchaseDealer.message}</p> : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>
            Dealer City <span className='text-destructive'>*</span>
          </span>
          <Input
            placeholder='e.g. Karachi'
            maxLength={DEALER_CITY_MAX_LENGTH}
            {...purchaseDealerCityField}
            onChange={handlePurchaseDealerCityChange}
          />
          {errors.purchaseDealerCity ? (
            <p className='text-xs text-destructive'>{errors.purchaseDealerCity.message}</p>
          ) : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>
            Dealer Address <span className='text-destructive'>*</span>
          </span>
          <Input
            placeholder='Street, area, city'
            maxLength={DEALER_ADDRESS_MAX_LENGTH}
            {...purchaseDealerAddressField}
          />
          {errors.purchaseDealerAddress ? (
            <p className='text-xs text-destructive'>{errors.purchaseDealerAddress.message}</p>
          ) : null}
        </label>
      </div>

      <label className='space-y-2'>
        <span className='text-sm font-medium text-text-primary'>Internal Notes (optional)</span>
        <Textarea rows={4} maxLength={NOTES_MAX_LENGTH} placeholder='Notes for internal review...' {...notesField} />
        {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
      </label>
    </section>
  );
};
