import type { JSX } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { FormInputField } from '#/components/shared';
import { Button } from '#/components/ui/Button';
import { ROUTES } from '#/constants';
import { authFormFields } from '#/constants/forms/authFormFields';
import type { LoginFormValues } from '#/schemas/authSchemas';
import { loginSchema } from '#/schemas/authSchemas';

interface LoginFormProps {
  isSubmitting: boolean;
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
}

/**
 * LoginForm renders the generic login form UI and validation.
 *
 * @param props - Submit handler and pending state.
 * @returns Login form component.
 */
export const LoginForm = ({ isSubmitting, onSubmit }: LoginFormProps): JSX.Element => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });
  const emailField = authFormFields.login[0];
  const passwordField = authFormFields.login[1];

  return (
    <form className='space-y-5' noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className='space-y-4'>
        <FormInputField
          id={emailField.name}
          label={emailField.label}
          type={emailField.type}
          placeholder={emailField.placeholder}
          registration={register(emailField.name)}
          error={errors[emailField.name]}
        />
        <FormInputField
          id={passwordField.name}
          label={passwordField.label}
          type={passwordField.type}
          placeholder={passwordField.placeholder}
          registration={register(passwordField.name)}
          error={errors[passwordField.name]}
        />
      </div>
      <div className='flex items-center justify-end'>
        <Link className='text-sm text-primary underline-offset-2 hover:underline' to={ROUTES.FORGOT_PASSWORD}>
          Forgot password?
        </Link>
      </div>
      <Button className='w-full' type='submit' disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
};
