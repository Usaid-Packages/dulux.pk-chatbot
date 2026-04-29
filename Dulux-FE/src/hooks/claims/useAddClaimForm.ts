import type { ChangeEvent } from 'react';
import { useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { CLAIM_NO_BASECOAT_OPTION_VALUE } from '#/constants';
import { useGetRegistrationByIdQuery, useGetRegistrationsQuery } from '#/data-layer/registrations';
import { createClaimSchema, type CreateClaimFormValues } from '#/schemas/claim.schema';
import type { ClaimBasecoatOptions, ClaimSelectOption } from '#/types/claims.form.types';
import type { CreateClaimPayload } from '#/types/claims.types';
import type { RegistrationPaintPair } from '#/types/registrations';
import { useAddClaimFieldSync } from './useAddClaimFieldSync';

interface UseAddClaimFormParams {
  onClose: () => void;
  onSubmit: (payload: CreateClaimPayload) => void;
}

export interface UseAddClaimFormResult {
  alternateAnglePhoto: File | undefined;
  basecoatOptions: ClaimBasecoatOptions;
  closeShotPhoto: File | undefined;
  control: ReturnType<typeof useForm<CreateClaimFormValues>>['control'];
  errors: FieldErrors<CreateClaimFormValues>;
  handleAlternateAngleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleCloseShotChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleFormSubmit: (values: CreateClaimFormValues) => void;
  handleLongShotChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleModalOpenChange: (open: boolean) => void;
  handleSubmit: ReturnType<typeof useForm<CreateClaimFormValues>>['handleSubmit'];
  handleTopcoatChange: (value: string) => void;
  hasTopcoatSelection: boolean;
  isBasecoatSelectDisabled: boolean;
  isNoBasecoatFlow: boolean;
  isRegistrationDetailLoading: boolean;
  isRegistrationSelected: boolean;
  isRegistrationsLoading: boolean;
  isTopcoatSelectDisabled: boolean;
  longShotPhoto: File | undefined;
  registrationId: string;
  registrationOptions: ClaimSelectOption[];
  register: UseFormRegister<CreateClaimFormValues>;
  selectedPaintPairId: string;
  topcoatOptions: ClaimSelectOption[];
  topcoatProductId: string;
}

const EMPTY_PAINT_PAIRS: RegistrationPaintPair[] = [];

const getSelectedFile = (event: ChangeEvent<HTMLInputElement>): File | null => {
  const selectedFile = event.currentTarget.files?.[0];
  return selectedFile ?? null;
};

const toNumericId = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

/**
 * useAddClaimForm manages AddClaimModal field state, dependencies, and payload mapping.
 */
export const useAddClaimForm = ({ onClose, onSubmit }: UseAddClaimFormParams): UseAddClaimFormResult => {
  const registrationsQuery = useGetRegistrationsQuery({
    state: 'APPROVED',
    ordering: '-created',
  });

  const {
    register,
    control,
    setValue,
    setError,
    clearErrors,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateClaimFormValues>({
    resolver: zodResolver(createClaimSchema),
    defaultValues: {
      registrationId: '',
      paintPairId: '',
      topcoatProductId: '',
      basecoatProductId: CLAIM_NO_BASECOAT_OPTION_VALUE,
      issueType: 'PEELING_CRACKING',
      affectedAreaSqft: undefined,
      notes: '',
      longShotPhoto: undefined,
      closeShotPhoto: undefined,
      alternateAnglePhoto: undefined,
    },
  });

  const registrationId = useWatch({ control, name: 'registrationId' });
  const topcoatProductId = useWatch({ control, name: 'topcoatProductId' });
  const basecoatProductId = useWatch({ control, name: 'basecoatProductId' });
  const longShotPhoto = useWatch({ control, name: 'longShotPhoto' });
  const closeShotPhoto = useWatch({ control, name: 'closeShotPhoto' });
  const alternateAnglePhoto = useWatch({ control, name: 'alternateAnglePhoto' });

  const registrationDetailQuery = useGetRegistrationByIdQuery(registrationId);
  const registrationPaintPairs = registrationDetailQuery.data?.paintPairs ?? EMPTY_PAINT_PAIRS;

  const registrationOptions = useMemo((): ClaimSelectOption[] => {
    return (registrationsQuery.data?.results ?? []).map(registration => ({
      id: String(registration.id),
      label: `${registration.registrationCode} - ${registration.customerName}`,
    }));
  }, [registrationsQuery.data?.results]);

  const topcoatOptions = useMemo((): ClaimSelectOption[] => {
    const topcoatMap = new Map<number, string>();

    registrationPaintPairs.forEach(pair => {
      if (!topcoatMap.has(pair.topcoat.id)) {
        topcoatMap.set(pair.topcoat.id, pair.topcoat.name);
      }
    });

    return Array.from(topcoatMap.entries()).map(([id, label]) => ({
      id: String(id),
      label,
    }));
  }, [registrationPaintPairs]);

  const selectedTopcoatId = toNumericId(topcoatProductId);
  const isRegistrationSelected = registrationId.trim().length > 0;
  const hasTopcoatSelection = topcoatProductId.trim().length > 0;

  const basecoatOptions = useMemo((): ClaimBasecoatOptions => {
    if (selectedTopcoatId === null) {
      return {
        hasNoBasecoat: false,
        items: [],
      };
    }

    const selectedTopcoatPairs = registrationPaintPairs.filter(pair => pair.topcoat.id === selectedTopcoatId);
    const hasNoBasecoat = selectedTopcoatPairs.some(pair => pair.basecoat === null);
    const basecoatMap = new Map<number, string>();

    selectedTopcoatPairs.forEach(pair => {
      if (pair.basecoat && !basecoatMap.has(pair.basecoat.id)) {
        basecoatMap.set(pair.basecoat.id, pair.basecoat.name);
      }
    });

    return {
      hasNoBasecoat,
      items: Array.from(basecoatMap.entries()).map(([id, label]) => ({
        id: String(id),
        label,
      })),
    };
  }, [registrationPaintPairs, selectedTopcoatId]);

  const isNoBasecoatFlow = basecoatOptions.hasNoBasecoat && basecoatOptions.items.length === 0;
  const isTopcoatSelectDisabled = !isRegistrationSelected || registrationDetailQuery.isLoading;
  const isBasecoatSelectDisabled = !hasTopcoatSelection || isNoBasecoatFlow || registrationDetailQuery.isLoading;

  const selectedPaintPairId = useMemo((): string => {
    if (!registrationDetailQuery.data) {
      return '';
    }

    const topcoatId = toNumericId(topcoatProductId);
    const normalizedBasecoatValue = basecoatProductId ?? CLAIM_NO_BASECOAT_OPTION_VALUE;
    const selectedBasecoatId =
      normalizedBasecoatValue === CLAIM_NO_BASECOAT_OPTION_VALUE ? null : toNumericId(normalizedBasecoatValue);

    if (
      topcoatId === null ||
      (normalizedBasecoatValue !== CLAIM_NO_BASECOAT_OPTION_VALUE && selectedBasecoatId === null)
    ) {
      return '';
    }

    const matchingPaintPair = registrationDetailQuery.data.paintPairs.find(pair => {
      const currentBasecoatId = pair.basecoat?.id ?? null;
      return pair.topcoat.id === topcoatId && currentBasecoatId === selectedBasecoatId;
    });

    return matchingPaintPair ? String(matchingPaintPair.id) : '';
  }, [registrationPaintPairs, topcoatProductId, basecoatProductId]);

  useAddClaimFieldSync({
    setValue,
    clearErrors,
    registrationId,
    topcoatProductId,
    isNoBasecoatFlow,
    selectedPaintPairId,
  });

  const handleModalOpenChange = (open: boolean): void => {
    if (!open) {
      reset();
      onClose();
    }
  };

  const handleLongShotChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setValue('longShotPhoto', getSelectedFile(event), { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const handleCloseShotChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setValue('closeShotPhoto', getSelectedFile(event), { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const handleAlternateAngleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setValue('alternateAnglePhoto', getSelectedFile(event), {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleTopcoatChange = (value: string): void => {
    void value;
    clearErrors('topcoatProductId');
  };

  const handleFormSubmit = (values: CreateClaimFormValues): void => {
    const registrationNumericId = toNumericId(values.registrationId);
    const paintPairNumericId = toNumericId(values.paintPairId) ?? toNumericId(selectedPaintPairId);

    if (!registrationNumericId) {
      setError('registrationId', { type: 'manual', message: 'Registration is required.' });
      return;
    }

    if (!paintPairNumericId) {
      setError('paintPairId', {
        type: 'manual',
        message: 'Please reselect topcoat/basecoat. Matching paint pair was not resolved.',
      });
      return;
    }

    clearErrors('paintPairId');

    onSubmit({
      registration: registrationNumericId,
      paintPair: paintPairNumericId,
      issueType: values.issueType,
      affectedAreaSqft: String(values.affectedAreaSqft),
      notes: values.notes?.trim() ?? '',
      photos: {
        longShot: values.longShotPhoto,
        closeShot: values.closeShotPhoto,
        alternateAngle: values.alternateAnglePhoto,
      },
    });
  };

  return {
    alternateAnglePhoto,
    basecoatOptions,
    closeShotPhoto,
    control,
    errors,
    handleAlternateAngleChange,
    handleCloseShotChange,
    handleFormSubmit,
    handleLongShotChange,
    handleModalOpenChange,
    handleSubmit,
    handleTopcoatChange,
    hasTopcoatSelection,
    isBasecoatSelectDisabled,
    isNoBasecoatFlow,
    isRegistrationDetailLoading: registrationDetailQuery.isLoading,
    isRegistrationSelected,
    isRegistrationsLoading: registrationsQuery.isLoading,
    isTopcoatSelectDisabled,
    longShotPhoto,
    registrationId,
    registrationOptions,
    register,
    selectedPaintPairId,
    topcoatOptions,
    topcoatProductId,
  };
};
