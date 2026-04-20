import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';

import type { CreateClaimFormValues } from '#/schemas/claim.schema';

export interface ClaimSelectOption {
  id: string;
  label: string;
}

export interface ClaimBasecoatOptions {
  hasNoBasecoat: boolean;
  items: ClaimSelectOption[];
}

export interface AddClaimSectionFormProps {
  control: Control<CreateClaimFormValues>;
  errors: FieldErrors<CreateClaimFormValues>;
}

export interface AddClaimDetailsSectionProps {
  errors: FieldErrors<CreateClaimFormValues>;
  register: UseFormRegister<CreateClaimFormValues>;
}
