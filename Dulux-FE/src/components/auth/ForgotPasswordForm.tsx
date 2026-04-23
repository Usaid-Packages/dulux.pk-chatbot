import type { JSX } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { FormInputField } from '#/components/shared';
import { Button } from '#/components/ui/Button';
import { ROUTES } from '#/constants';
import { authFormFields } from '#/constants/forms/authFormFields';
import type { ForgotPasswordFormValues } from '#/schemas/authSchemas';
import { forgotPasswordSchema } from '#/schemas/authSchemas';

interface ForgotPasswordFormProps {
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (values: ForgotPasswordFormValues) => void | Promise<void>;
}

/**
 * ForgotPasswordForm renders a reusable forgot-password form.
 *
 * @param props - Submit handler and pending state.
 * @returns Forgot password form component.
 */
export const ForgotPasswordForm = ({ isSubmitting, errorMessage, onSubmit }: ForgotPasswordFormProps): JSX.Element => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
  });

  const emailField = authFormFields.forgotPassword[0];

  return (
    <form className='space-y-5' noValidate onSubmit={handleSubmit(onSubmit)}>
      <FormInputField
        id={emailField.name}
        label={emailField.label}
        type={emailField.type}
        placeholder={emailField.placeholder}
        registration={register(emailField.name)}
        error={errors[emailField.name]}
      />
      {errorMessage && (
        <p
          role='alert'
          className='rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'
        >
          {errorMessage}
        </p>
      )}
      <Button variant='primaryGradientStrong' className='h-11 w-full rounded-xl' type='submit' disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send reset instructions'}
      </Button>
      <div className='text-center'>
        <Link className='text-sm font-semibold text-primary underline-offset-2 hover:underline' to={ROUTES.LOGIN}>
          Back to login
        </Link>
      </div>
    </form>
  );
};
