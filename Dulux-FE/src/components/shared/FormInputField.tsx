import type { JSX } from 'react';
import { useState } from 'react';

import { Eye, EyeOff } from 'lucide-react';
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
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const hasError = Boolean(error);
  const describedBy = hasError ? `${id}-error` : undefined;
  const isPasswordField = type === PASSWORD;
  const inputType = isPasswordField && isPasswordVisible ? 'text' : type;

  const togglePasswordVisibility = (): void => {
    setIsPasswordVisible(previous => !previous);
  };

  return (
    <div className='space-y-2'>
      <label htmlFor={id} className='block text-sm font-medium text-foreground'>
        {label} <span className='text-destructive'>*</span>
      </label>
      <div className='relative'>
        <Input
          id={id}
          type={inputType}
          placeholder={placeholder}
          autoComplete={type === PASSWORD ? PASSWORD : EMAIL}
          className='h-10 bg-background pr-10'
          aria-invalid={hasError}
          aria-describedby={describedBy}
          {...registration}
        />
        {isPasswordField ? (
          <button
            type='button'
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            className='absolute inset-y-0 right-0 inline-flex h-full w-10 items-center justify-center text-text-muted transition-colors hover:text-text-primary'
            onClick={togglePasswordVisibility}
          >
            {isPasswordVisible ? (
              <EyeOff className='h-4 w-4' aria-hidden='true' />
            ) : (
              <Eye className='h-4 w-4' aria-hidden='true' />
            )}
          </button>
        ) : null}
      </div>
      {hasError ? (
        <p id={`${id}-error`} role='alert' className='text-xs text-destructive'>
          {error?.message}
        </p>
      ) : null}
    </div>
  );
};
