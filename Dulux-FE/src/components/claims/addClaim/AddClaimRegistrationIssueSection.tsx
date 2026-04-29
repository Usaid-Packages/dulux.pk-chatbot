import type { JSX } from 'react';

import { Controller } from 'react-hook-form';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import type { AddClaimSectionFormProps, ClaimSelectOption } from '#/types/claims.form.types';
import type { ClaimIssueTypeOption } from '#/types/claims.types';

interface AddClaimRegistrationIssueSectionProps extends AddClaimSectionFormProps {
  issueTypeOptions: ReadonlyArray<ClaimIssueTypeOption>;
  isRegistrationsLoading: boolean;
  registrationOptions: ClaimSelectOption[];
}

/**
 * AddClaimRegistrationIssueSection renders registration and issue-type selectors.
 */
export const AddClaimRegistrationIssueSection = ({
  control,
  errors,
  issueTypeOptions,
  isRegistrationsLoading,
  registrationOptions,
}: AddClaimRegistrationIssueSectionProps): JSX.Element => {
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <div className='space-y-2'>
        <label htmlFor='claim-registration' className='text-sm font-medium text-text-primary'>
          Approved Registration <span className='text-destructive'>*</span>
        </label>
        <Controller
          control={control}
          name='registrationId'
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id='claim-registration'>
                <SelectValue
                  placeholder={isRegistrationsLoading ? 'Loading registrations...' : 'Select registration'}
                />
              </SelectTrigger>
              <SelectContent>
                {registrationOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.registrationId ? <p className='text-xs text-destructive'>{errors.registrationId.message}</p> : null}
      </div>

      <div className='space-y-2'>
        <label htmlFor='claim-issue-type' className='text-sm font-medium text-text-primary'>
          Issue Type <span className='text-destructive'>*</span>
        </label>
        <Controller
          control={control}
          name='issueType'
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id='claim-issue-type'>
                <SelectValue placeholder='Select issue type' />
              </SelectTrigger>
              <SelectContent>
                {issueTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.issueType ? <p className='text-xs text-destructive'>{errors.issueType.message}</p> : null}
      </div>
    </div>
  );
};
