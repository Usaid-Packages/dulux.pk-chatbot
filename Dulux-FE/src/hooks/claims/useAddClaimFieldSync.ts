import { useEffect } from 'react';

import type { UseFormClearErrors, UseFormSetValue } from 'react-hook-form';

import { CLAIM_NO_BASECOAT_OPTION_VALUE } from '#/constants';
import type { CreateClaimFormValues } from '#/schemas/claim.schema';

interface UseAddClaimFieldSyncParams {
  setValue: UseFormSetValue<CreateClaimFormValues>;
  clearErrors: UseFormClearErrors<CreateClaimFormValues>;
  registrationId: string;
  topcoatProductId: string;
  isNoBasecoatFlow: boolean;
  selectedPaintPairId: string;
}

const resetClaimFieldValue = (
  setValue: UseFormSetValue<CreateClaimFormValues>,
  field: keyof CreateClaimFormValues,
  value: CreateClaimFormValues[keyof CreateClaimFormValues]
): void => {
  setValue(field, value, {
    shouldDirty: false,
    shouldTouch: false,
    shouldValidate: false,
  });
};

/**
 * Synchronizes dependent AddClaim form fields when parent selections change.
 *
 * @param params - Form adapters and watched dependency values.
 */
export const useAddClaimFieldSync = ({
  setValue,
  clearErrors,
  registrationId,
  topcoatProductId,
  isNoBasecoatFlow,
  selectedPaintPairId,
}: UseAddClaimFieldSyncParams): void => {
  useEffect(() => {
    setValue('paintPairId', selectedPaintPairId, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  }, [selectedPaintPairId, setValue]);

  useEffect(() => {
    resetClaimFieldValue(setValue, 'topcoatProductId', '');
    resetClaimFieldValue(setValue, 'basecoatProductId', CLAIM_NO_BASECOAT_OPTION_VALUE);
    resetClaimFieldValue(setValue, 'paintPairId', '');
    clearErrors(['topcoatProductId', 'basecoatProductId', 'paintPairId']);
  }, [clearErrors, registrationId, setValue]);

  useEffect(() => {
    resetClaimFieldValue(setValue, 'basecoatProductId', CLAIM_NO_BASECOAT_OPTION_VALUE);
    resetClaimFieldValue(setValue, 'paintPairId', '');
    clearErrors(['basecoatProductId', 'paintPairId']);
  }, [clearErrors, setValue, topcoatProductId]);

  useEffect(() => {
    if (!isNoBasecoatFlow) {
      return;
    }

    resetClaimFieldValue(setValue, 'basecoatProductId', CLAIM_NO_BASECOAT_OPTION_VALUE);
    clearErrors('basecoatProductId');
  }, [clearErrors, isNoBasecoatFlow, setValue]);
};
