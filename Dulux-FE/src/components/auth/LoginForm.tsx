import type { JSX } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { Button } from '#/components/ui/Button';
import { authFormFields, ROUTES } from '#/constants';
import type { LoginFormValues } from '#/schemas/authSchemas';
import { loginSchema } from '#/schemas/authSchemas';
import { AuthInputField } from './AuthInputField';

interface LoginFormProps {
  isSubmitting: boolean;
  onSubmit: (values: LoginFormValues) => Promise<void>;
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

  const renderLoginField = (field: (typeof authFormFields.login)[number]): JSX.Element => {
    return (
      <AuthInputField
        key={field.name}
        id={field.name}
        label={field.label}
        type={field.type}
        placeholder={field.placeholder}
        registration={register(field.name)}
        error={errors[field.name]}
      />
    );
  };

  return (
    <form className='space-y-5' noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className='space-y-4'>{authFormFields.login.map(renderLoginField)}</div>
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
