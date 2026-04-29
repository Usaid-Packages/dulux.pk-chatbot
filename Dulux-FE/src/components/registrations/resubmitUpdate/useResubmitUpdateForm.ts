import type { ChangeEvent, FocusEvent, MouseEvent } from 'react';
import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Control, FieldErrors, UseFormHandleSubmit, UseFormRegister } from 'react-hook-form';
import { useFieldArray, useForm } from 'react-hook-form';

import { REQUESTED_FIELD_ORDER } from '#/constants/registrations';
import { useGetManualRegistrationProductsQuery } from '#/data-layer/registrations';
import { useDialogLifecycle } from '#/hooks/common/useDialogLifecycle';
import { resubmitUpdateSchema, type ResubmitUpdateFormValues } from '#/schemas/registrations';
import type { ManualRegistrationProductOption } from '#/types/manualRegistration';
import type { RegistrationDetail, RegistrationRejectionField, RequestedCorrectionNote } from '#/types/registrations';
import {
  getDefaultPaintPairs,
  getProductOptionLabel,
  getRegistrationBasecoatFallbackByTopcoatId,
  getRegistrationTopcoatFallbackOptions,
  getRequestedCorrectionNotes,
  mergeUniqueProductOptions,
  normalizePkPhoneWithPrefix,
  sanitizeLettersOnly,
} from '#/utils';

interface UseResubmitUpdateFormParams {
  isOpen: boolean;
  registration: RegistrationDetail;
  onClose: () => void;
}

export interface ResubmitUpdateSelectOption {
  id: string;
  label: string;
}

export interface ResubmitUpdatePaintPairRowViewModel {
  rowId: string;
  rowIndex: number;
  selectedTopcoatId: string;
  selectedBasecoatId: string;
  basecoatOptions: ResubmitUpdateSelectOption[];
}

export interface UseResubmitUpdateFormResult {
  requestedFieldNames: RegistrationRejectionField['fieldName'][];
  requestedCorrectionNotes: RequestedCorrectionNote[];
  control: Control<ResubmitUpdateFormValues>;
  register: UseFormRegister<ResubmitUpdateFormValues>;
  errors: FieldErrors<ResubmitUpdateFormValues>;
  handleSubmit: UseFormHandleSubmit<ResubmitUpdateFormValues>;
  paintPairRows: ResubmitUpdatePaintPairRowViewModel[];
  topcoatOptions: ResubmitUpdateSelectOption[];
  isPaintProductsLoading: boolean;
  isPaintProductsError: boolean;
  paintProductsErrorMessage: string;
  handleCityChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handlePurchaseDealerChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handlePurchaseDealerCityChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handlePhoneNumberChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handlePhoneNumberFocus: (event: FocusEvent<HTMLInputElement>) => void;
  handleModalClose: () => void;
  handleModalOpenChange: (open: boolean) => void;
  handleAddPaintPair: () => void;
  handleRemovePaintPair: (event: MouseEvent<HTMLButtonElement>) => void;
  buildInvoiceFilesChangeHandler: (onChange: (value: File[]) => void) => (event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Provides form state, request-aware option loading and UI handlers for registration resubmission updates.
 *
 * @param params - Dialog state, registration data and close callback.
 * @returns Form adapters and grouped handlers for the resubmit-update modal.
 */
export const useResubmitUpdateForm = ({
  isOpen,
  registration,
  onClose,
}: UseResubmitUpdateFormParams): UseResubmitUpdateFormResult => {
  const requestedFieldNames = useMemo<RegistrationRejectionField['fieldName'][]>(() => {
    const names = new Set(registration.rejectionFields.map(field => field.fieldName));
    return REQUESTED_FIELD_ORDER.filter(fieldName => names.has(fieldName));
  }, [registration.rejectionFields]);
  const shouldLoadPaintOptions = isOpen && requestedFieldNames.includes('paint_pairs');
  const requestedCorrectionNotes = getRequestedCorrectionNotes(registration.rejectionFields, requestedFieldNames);

  const defaultValues = useMemo<ResubmitUpdateFormValues>(() => {
    return {
      customerName: registration.customerName,
      phoneNumber: registration.phoneNumber,
      email: registration.email,
      city: registration.city,
      siteAddress: registration.siteAddress,
      purchaseDate: registration.purchaseDate,
      purchaseDealer: registration.purchaseDealer,
      purchaseDealerCity: registration.purchaseDealerCity,
      purchaseDealerAddress: registration.purchaseDealerAddress,
      postalCode: registration.postalCode,
      paintPairs: getDefaultPaintPairs(registration),
      invoiceFiles: [],
    };
  }, [registration]);

  const {
    control,
    getValues,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ResubmitUpdateFormValues>({
    resolver: zodResolver(resubmitUpdateSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'paintPairs',
  });

  const watchedPaintPairs = watch('paintPairs') ?? [];
  const selectedTopcoatIds = useMemo<string[]>(() => {
    return Array.from(
      new Set(watchedPaintPairs.map(paintPair => paintPair.topcoatId.trim()).filter(topcoatId => topcoatId.length > 0))
    );
  }, [watchedPaintPairs]);

  const manualProductsQuery = useGetManualRegistrationProductsQuery({
    enabled: shouldLoadPaintOptions,
    basecoatTopcoatIds: selectedTopcoatIds,
  });

  const topcoatProducts = useMemo<ManualRegistrationProductOption[]>(() => {
    return mergeUniqueProductOptions(
      manualProductsQuery.data?.topcoatProducts ?? [],
      getRegistrationTopcoatFallbackOptions(registration)
    );
  }, [manualProductsQuery.data?.topcoatProducts, registration]);

  const registrationBasecoatFallbackByTopcoatId = useMemo<
    ReadonlyMap<string, ManualRegistrationProductOption[]>
  >(() => {
    return getRegistrationBasecoatFallbackByTopcoatId(registration);
  }, [registration]);

  const basecoatOptionsByTopcoatId = useMemo<ReadonlyMap<string, ManualRegistrationProductOption[]>>(() => {
    const optionsByTopcoatId = new Map<string, ManualRegistrationProductOption[]>();

    topcoatProducts.forEach(topcoat => {
      const fallbackOptions = registrationBasecoatFallbackByTopcoatId.get(topcoat.id) ?? [];
      optionsByTopcoatId.set(topcoat.id, mergeUniqueProductOptions(topcoat.linkedBasecoats ?? [], fallbackOptions));
    });

    registrationBasecoatFallbackByTopcoatId.forEach((fallbackOptions, topcoatId) => {
      if (!optionsByTopcoatId.has(topcoatId)) {
        optionsByTopcoatId.set(topcoatId, fallbackOptions);
      }
    });

    return optionsByTopcoatId;
  }, [registrationBasecoatFallbackByTopcoatId, topcoatProducts]);

  const topcoatOptions = useMemo<ResubmitUpdateSelectOption[]>(() => {
    return topcoatProducts.map(product => ({
      id: product.id,
      label: getProductOptionLabel(product),
    }));
  }, [topcoatProducts]);

  const basecoatSelectOptionsByTopcoatId = useMemo<ReadonlyMap<string, ResubmitUpdateSelectOption[]>>(() => {
    const optionsByTopcoatId = new Map<string, ResubmitUpdateSelectOption[]>();

    basecoatOptionsByTopcoatId.forEach((options, topcoatId) => {
      optionsByTopcoatId.set(
        topcoatId,
        options.map(option => ({
          id: option.id,
          label: getProductOptionLabel(option),
        }))
      );
    });

    return optionsByTopcoatId;
  }, [basecoatOptionsByTopcoatId]);

  const basecoatIdSetByTopcoatId = useMemo<ReadonlyMap<string, ReadonlySet<string>>>(() => {
    const idSetByTopcoatId = new Map<string, ReadonlySet<string>>();

    basecoatOptionsByTopcoatId.forEach((options, topcoatId) => {
      idSetByTopcoatId.set(topcoatId, new Set(options.map(option => option.id)));
    });

    return idSetByTopcoatId;
  }, [basecoatOptionsByTopcoatId]);

  const paintPairRows = useMemo<ResubmitUpdatePaintPairRowViewModel[]>(() => {
    return fields.map((field, index) => {
      const selectedTopcoatId = watchedPaintPairs[index]?.topcoatId?.trim() ?? '';
      const selectedBasecoatId = watchedPaintPairs[index]?.basecoatId?.trim() ?? '';

      return {
        rowId: field.id,
        rowIndex: index,
        selectedTopcoatId,
        selectedBasecoatId,
        basecoatOptions: selectedTopcoatId ? (basecoatSelectOptionsByTopcoatId.get(selectedTopcoatId) ?? []) : [],
      };
    });
  }, [basecoatSelectOptionsByTopcoatId, fields, watchedPaintPairs]);

  useEffect(() => {
    const currentPhone = getValues('phoneNumber');
    if (!currentPhone) {
      setValue('phoneNumber', '92', { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
  }, [getValues, setValue]);

  useEffect(() => {
    watchedPaintPairs.forEach((paintPair, index) => {
      const selectedTopcoatId = paintPair.topcoatId.trim();
      const selectedBasecoatId = paintPair.basecoatId.trim();

      if (!selectedTopcoatId || !selectedBasecoatId) {
        return;
      }

      const linkedBasecoatIds = basecoatIdSetByTopcoatId.get(selectedTopcoatId) ?? new Set<string>();

      if (!linkedBasecoatIds.has(selectedBasecoatId)) {
        setValue(`paintPairs.${index}.basecoatId`, '', { shouldValidate: true });
        setValue(`paintPairs.${index}.basecoatQuantity`, '', { shouldValidate: true });
      }
    });
  }, [basecoatIdSetByTopcoatId, setValue, watchedPaintPairs]);

  const phoneNumberField = register('phoneNumber');
  const cityField = register('city');
  const purchaseDealerField = register('purchaseDealer');
  const purchaseDealerCityField = register('purchaseDealerCity');

  const handleCityChange = (event: ChangeEvent<HTMLInputElement>): void => {
    event.currentTarget.value = sanitizeLettersOnly(event.currentTarget.value);
    cityField.onChange(event);
  };

  const handlePurchaseDealerChange = (event: ChangeEvent<HTMLInputElement>): void => {
    event.currentTarget.value = sanitizeLettersOnly(event.currentTarget.value);
    purchaseDealerField.onChange(event);
  };

  const handlePurchaseDealerCityChange = (event: ChangeEvent<HTMLInputElement>): void => {
    event.currentTarget.value = sanitizeLettersOnly(event.currentTarget.value);
    purchaseDealerCityField.onChange(event);
  };

  const handlePhoneNumberChange = (event: ChangeEvent<HTMLInputElement>): void => {
    event.currentTarget.value = normalizePkPhoneWithPrefix(event.currentTarget.value);
    phoneNumberField.onChange(event);
  };

  const handlePhoneNumberFocus = (event: FocusEvent<HTMLInputElement>): void => {
    if (!event.currentTarget.value) {
      event.currentTarget.value = '92';
      setValue('phoneNumber', '92', { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
  };

  const handleResubmitUpdateModalReset = (): void => {
    reset(defaultValues);
  };

  const { handleDialogClose, handleDialogOpenChange } = useDialogLifecycle({
    onClose,
    onReset: handleResubmitUpdateModalReset,
  });

  const handleAddPaintPair = (): void => {
    append({
      topcoatId: '',
      topcoatQuantity: '',
      basecoatId: '',
      basecoatQuantity: '',
    });
  };

  const handleRemovePaintPair = (event: MouseEvent<HTMLButtonElement>): void => {
    const indexValue = event.currentTarget.dataset.index;
    const index = Number.parseInt(indexValue ?? '', 10);

    if (Number.isInteger(index) && index >= 0) {
      remove(index);
    }
  };

  const buildInvoiceFilesChangeHandler =
    (onChange: (value: File[]) => void) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      const files = event.target.files ? Array.from(event.target.files) : [];
      onChange(files);
    };

  return {
    requestedFieldNames,
    requestedCorrectionNotes,
    control,
    register,
    errors,
    handleSubmit,
    paintPairRows,
    topcoatOptions,
    isPaintProductsLoading: manualProductsQuery.isLoading,
    isPaintProductsError: manualProductsQuery.isError,
    paintProductsErrorMessage: manualProductsQuery.error?.message ?? 'Unable to load topcoat products.',
    handleCityChange,
    handlePurchaseDealerChange,
    handlePurchaseDealerCityChange,
    handlePhoneNumberChange,
    handlePhoneNumberFocus,
    handleModalClose: handleDialogClose,
    handleModalOpenChange: handleDialogOpenChange,
    handleAddPaintPair,
    handleRemovePaintPair,
    buildInvoiceFilesChangeHandler,
  };
};
