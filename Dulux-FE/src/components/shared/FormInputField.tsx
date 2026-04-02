import type { JSX } from 'react';

import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '#/components/ui/Input';
import { EMAIL, PASSWORD } from '#/constants';

interface FormInputFieldProps {
  id: string;
  label: string;
  type: 'email' | 'password' | 'text';
  placeholder: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
}

/**
 * FormInputField renders a reusable labeled input with error text.
 *
 * @param props - Input metadata, registration binding, and error state.
 * @returns Shared input field component for forms.
 */
export const FormInputField = ({
  id,
  label,
  type,
  placeholder,
  registration,
  error,
}: FormInputFieldProps): JSX.Element => {
  const hasError = Boolean(error);
  const describedBy = hasError ? `${id}-error` : undefined;

  return (
    <div className='space-y-2'>
      <label htmlFor={id} className='block text-sm font-medium text-foreground'>
        {label}
      </label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={type === PASSWORD ? PASSWORD : EMAIL}
        className='h-10 bg-background'
        aria-invalid={hasError}
        aria-describedby={describedBy}
        {...registration}
      />
      {hasError ? (
        <p id={`${id}-error`} role='alert' className='text-xs text-destructive'>
          {error?.message}
        </p>
      ) : null}
    </div>
  );
};
