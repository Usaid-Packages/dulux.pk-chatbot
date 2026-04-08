import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';

import { format, parseISO } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';

import { Input, Textarea } from '#/components/ui';
import { Calendar } from '#/components/ui/Calendar';
import type { ManualRegistrationFormValues } from '#/types/manualRegistration';

const DATE_FORMAT = 'yyyy-MM-dd';

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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarWrapperRef = useRef<HTMLDivElement | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  return (
    <section className='space-y-4 wf-card wf-card-p5'>
      <header>
        <h3 className='text-lg font-semibold text-text-primary'>Purchase & Dealer</h3>
        <p className='text-sm text-text-muted'>Capture where and when paint products were purchased.</p>
      </header>

      <div className='grid gap-4 md:grid-cols-2'>
        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Purchase Date</span>
          <Controller
            name='purchaseDate'
            control={control}
            render={({ field }) => {
              const selectedDate = parsePurchaseDate(field.value);
              const handleOpenCalendar = (): void => {
                setIsCalendarOpen(true);
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
                      onBlur={field.onBlur}
                    />
                    <CalendarDays
                      aria-hidden='true'
                      className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted'
                    />
                  </div>
                  {isCalendarOpen ? (
                    <div
                      role='dialog'
                      aria-label='Purchase date calendar'
                      className='absolute left-0 z-20 mt-2 rounded-xl border border-border-strong bg-white p-2 shadow-[0_12px_24px_rgba(15,23,42,0.16)]'
                    >
                      <Calendar
                        mode='single'
                        selected={selectedDate}
                        onSelect={handleSelectDate}
                        disabled={date => date > today}
                        className='rounded-lg bg-white p-3 [--cell-size:2.45rem]'
                        classNames={{
                          nav: 'absolute inset-x-0 top-0 flex w-full items-center justify-between px-2',
                          month_caption:
                            'flex h-[--cell-size] w-full items-center justify-center px-[--cell-size] pb-2',
                          weekdays: 'mb-3 flex gap-2.5',
                          week: 'mt-2.5 flex w-full gap-2.5',
                          weekday: 'flex-1 text-center text-[0.75rem] font-medium text-blue-700/80',
                          day: 'relative flex-1 aspect-square h-full w-full select-none p-0 text-center',
                          outside: 'text-slate-400 opacity-70',
                          disabled: 'text-slate-300 opacity-50',
                          today:
                            'rounded-md border border-blue-300 bg-blue-50 text-blue-700 data-[selected=true]:bg-blue-600 data-[selected=true]:text-white',
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
