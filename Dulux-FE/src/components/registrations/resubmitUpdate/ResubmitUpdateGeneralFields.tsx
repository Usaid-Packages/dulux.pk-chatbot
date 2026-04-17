import type { ChangeEvent, FocusEvent, JSX } from 'react';

import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import { Input } from '#/components/ui/Input';
import { MANUAL_REGISTRATION_PROVINCE_OPTIONS } from '#/constants';
import {
  CITY_MAX_LENGTH,
  DEALER_ADDRESS_MAX_LENGTH,
  DEALER_CITY_MAX_LENGTH,
  DEALER_NAME_MAX_LENGTH,
  PHONE_PLACEHOLDER,
} from '#/constants/registrations';
import type { ResubmitUpdateFormValues } from '#/schemas/registrations';
import type { RegistrationRejectionField } from '#/types/registrations';

interface ResubmitUpdateGeneralFieldsProps {
  requestedFieldNames: RegistrationRejectionField['fieldName'][];
  control: Control<ResubmitUpdateFormValues>;
  register: UseFormRegister<ResubmitUpdateFormValues>;
  errors: FieldErrors<ResubmitUpdateFormValues>;
  onCityChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPurchaseDealerChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPurchaseDealerCityChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPhoneNumberChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPhoneNumberFocus: (event: FocusEvent<HTMLInputElement>) => void;
}

/**
 * Renders requested profile and purchase detail fields for resubmission update flow.
 *
 * @param props - Registration requested fields and RHF adapters.
 * @returns Grouped scalar input fields.
 */
export const ResubmitUpdateGeneralFields = ({
  requestedFieldNames,
  control,
  register,
  errors,
  onCityChange,
  onPurchaseDealerChange,
  onPurchaseDealerCityChange,
  onPhoneNumberChange,
  onPhoneNumberFocus,
}: ResubmitUpdateGeneralFieldsProps): JSX.Element => {
  const customerNameField = register('customerName');
  const phoneNumberField = register('phoneNumber');
  const emailField = register('email');
  const cityField = register('city');
  const siteAddressField = register('siteAddress');
  const purchaseDealerField = register('purchaseDealer');
  const purchaseDealerCityField = register('purchaseDealerCity');
  const purchaseDealerAddressField = register('purchaseDealerAddress');
  const postalCodeField = register('postalCode');

  return (
    <>
      {requestedFieldNames.includes('customer_name') ? (
        <div>
          <label className='text-sm font-medium text-text-primary'>Full Name</label>
          <Input placeholder='e.g. Ahmed Raza' {...customerNameField} />
          {errors.customerName ? <p className='mt-1 text-xs text-destructive'>{errors.customerName.message}</p> : null}
        </div>
      ) : null}

      {requestedFieldNames.includes('phone_number') ? (
        <div>
          <label className='text-sm font-medium text-text-primary'>Phone Number</label>
          <Input
            placeholder={PHONE_PLACEHOLDER}
            {...phoneNumberField}
            onChange={onPhoneNumberChange}
            onFocus={onPhoneNumberFocus}
          />
          {errors.phoneNumber ? <p className='mt-1 text-xs text-destructive'>{errors.phoneNumber.message}</p> : null}
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
          <Input placeholder='e.g. Lahore' maxLength={CITY_MAX_LENGTH} {...cityField} onChange={onCityChange} />
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
            onChange={onPurchaseDealerChange}
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
            onChange={onPurchaseDealerCityChange}
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
    </>
  );
};
