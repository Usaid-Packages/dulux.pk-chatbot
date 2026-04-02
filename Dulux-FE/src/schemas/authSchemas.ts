import { z } from 'zod';

import { authFormFields } from '#/constants/forms/authFormFields';

const RESET_PASSWORD_FIELDS = authFormFields.resetPassword;

const PASSWORD_MIN_LENGTH = authFormFields.login[1].minLength ?? 8;
const RESET_PASSWORD_MIN_LENGTH = RESET_PASSWORD_FIELDS[0].minLength ?? 8;
const PASSWORD_MUST_MATCH_FIELD = RESET_PASSWORD_FIELDS[1].mustMatchField ?? 'password';
const EMAIL_SCHEMA = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .pipe(z.email('Please enter a valid email address.'));

export const loginSchema = z.object({
  email: EMAIL_SCHEMA,
  password: z.string().trim().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`),
});

export const forgotPasswordSchema = z.object({
  email: EMAIL_SCHEMA,
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .trim()
      .min(RESET_PASSWORD_MIN_LENGTH, `Password must be at least ${RESET_PASSWORD_MIN_LENGTH} characters.`),
    confirmPassword: z.string().trim().min(1, 'Please confirm your password.'),
  })
  .superRefine((value, ctx) => {
    if (value.confirmPassword !== value[PASSWORD_MUST_MATCH_FIELD as 'password']) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
      });
    }
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
