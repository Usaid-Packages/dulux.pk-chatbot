import type { JSX } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { FormInputField } from '#/components/shared';
import { Button } from '#/components/ui/Button';
import { ROUTES } from '#/constants';
import { authFormFields } from '#/constants/forms/authFormFields';
import type { ResetPasswordFormValues } from '#/schemas/authSchemas';
import { resetPasswordSchema } from '#/schemas/authSchemas';

interface ResetPasswordFormProps {
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (values: ResetPasswordFormValues) => void | Promise<void>;
}

/**
 * ResetPasswordForm renders password + confirm password fields with cross-field validation.
 *
 * @param props - Submit handler, pending state, and optional error message.
 * @returns Reset password form component.
 */
export const ResetPasswordForm = ({ isSubmitting, errorMessage, onSubmit }: ResetPasswordFormProps): JSX.Element => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
  });

  const passwordField = authFormFields.resetPassword[0];
  const confirmPasswordField = authFormFields.resetPassword[1];

  return (
    <form className='space-y-5' noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className='space-y-4'>
        <FormInputField
          id={passwordField.name}
          label={passwordField.label}
          type={passwordField.type}
          placeholder={passwordField.placeholder}
          registration={register('password')}
          error={errors.password}
        />
        <FormInputField
          id={confirmPasswordField.name}
          label={confirmPasswordField.label}
          type={confirmPasswordField.type}
          placeholder={confirmPasswordField.placeholder}
          registration={register('confirmPassword')}
          error={errors.confirmPassword}
        />
      </div>
      {errorMessage && (
        <p
          role='alert'
          className='rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'
        >
          {errorMessage}
        </p>
      )}
      <Button
        className='h-11 w-full rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white shadow-[0_12px_28px_rgba(24,102,198,0.35)] hover:brightness-105'
        type='submit'
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Updating...' : 'Reset password'}
      </Button>
      <div className='text-center'>
        <Link className='text-sm font-semibold text-primary underline-offset-2 hover:underline' to={ROUTES.LOGIN}>
          Back to login
        </Link>
      </div>
    </form>
  );
};
