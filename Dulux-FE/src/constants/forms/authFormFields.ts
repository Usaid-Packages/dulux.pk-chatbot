export interface AuthFormFieldDefinition {
  name: string;
  label: string;
  placeholder: string;
  type: 'email' | 'password';
  minLength?: number;
  mustMatchField?: string;
}

export const authFormFields = {
  login: [
    {
      name: 'email',
      label: 'Email',
      placeholder: 'you@company.com',
      type: 'email',
    },
    {
      name: 'password',
      label: 'Password',
      placeholder: 'Enter your password',
      type: 'password',
      minLength: 8,
    },
  ],
  forgotPassword: [
    {
      name: 'email',
      label: 'Email',
      placeholder: 'you@company.com',
      type: 'email',
    },
  ],
  resetPassword: [
    {
      name: 'password',
      label: 'New Password',
      placeholder: 'Create a strong password',
      type: 'password',
      minLength: 8,
    },
    {
      name: 'confirmPassword',
      label: 'Confirm Password',
      placeholder: 'Retype your password',
      type: 'password',
      minLength: 8,
      mustMatchField: 'password',
    },
  ],
} as const;
