import type { ChangeEvent, FocusEvent, JSX } from 'react';
import { useEffect } from 'react';

import { useFormContext } from 'react-hook-form';

import { Input } from '#/components/ui';
import type { ManualRegistrationFormValues } from '#/types/manualRegistration';

/**
 * PersonalInfoStep renders customer identity and site fields for step 1.
 *
 * @returns Personal info step form section.
 */
export const PersonalInfoStep = (): JSX.Element => {
  const {
    getValues,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<ManualRegistrationFormValues>();

  useEffect(() => {
    const currentPhone = getValues('phoneNumber');
    if (!currentPhone) {
      setValue('phoneNumber', '92', { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
  }, [getValues, setValue]);

  const handlePostalCodeChange = (event: ChangeEvent<HTMLInputElement>): void => {
    event.currentTarget.value = event.currentTarget.value.replace(/[^a-zA-Z0-9-]/g, '');
  };

  const handlePhoneNumberChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const digitsOnly = event.currentTarget.value.replace(/\D/g, '');
    const withoutPrefix = digitsOnly.startsWith('92') ? digitsOnly.slice(2) : digitsOnly;
    const normalizedLocalPart = withoutPrefix.startsWith('3') ? withoutPrefix : `3${withoutPrefix}`;
    const limitedLocalPart = normalizedLocalPart.slice(0, 10);
    event.currentTarget.value = `92${limitedLocalPart}`;
  };

  const handlePhoneNumberFocus = (event: FocusEvent<HTMLInputElement>): void => {
    if (!event.currentTarget.value) {
      event.currentTarget.value = '92';
    }
  };

  return (
    <section className='space-y-4 wf-card wf-card-p5'>
      <header>
        <h3 className='text-lg font-semibold text-text-primary'>Personal Information</h3>
        <p className='text-sm text-text-muted'>Add customer contact and site details for this registration.</p>
      </header>

      <div className='grid gap-4 md:grid-cols-2'>
        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Customer Name</span>
          <Input placeholder='e.g. Ahmed Raza' {...register('customerName')} />
          {errors.customerName ? <p className='text-xs text-destructive'>{errors.customerName.message}</p> : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Phone Number</span>
          <Input
            placeholder='92XXXXXXXXXX'
            {...register('phoneNumber')}
            onChange={handlePhoneNumberChange}
            onFocus={handlePhoneNumberFocus}
          />
          {errors.phoneNumber ? <p className='text-xs text-destructive'>{errors.phoneNumber.message}</p> : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Email</span>
          <Input type='email' placeholder='customer@example.com' {...register('email')} />
          {errors.email ? <p className='text-xs text-destructive'>{errors.email.message}</p> : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>City</span>
          <Input placeholder='e.g. Lahore' {...register('city')} />
          {errors.city ? <p className='text-xs text-destructive'>{errors.city.message}</p> : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Province</span>
          <Input placeholder='e.g. Punjab' {...register('province')} />
          {errors.province ? <p className='text-xs text-destructive'>{errors.province.message}</p> : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Postal Code (optional)</span>
          <Input placeholder='e.g. 54000' {...register('postalCode')} onChange={handlePostalCodeChange} />
          {errors.postalCode ? <p className='text-xs text-destructive'>{errors.postalCode.message}</p> : null}
        </label>
      </div>

      <label className='space-y-2'>
        <span className='text-sm font-medium text-text-primary'>Site Address</span>
        <Input placeholder='Street, area, city' {...register('siteAddress')} />
        {errors.siteAddress ? <p className='text-xs text-destructive'>{errors.siteAddress.message}</p> : null}
      </label>
    </section>
  );
};
