import type { ChangeEvent, JSX } from 'react';
import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '#/components/ui';
import { useGetRegistrationByIdQuery, useGetRegistrationsQuery } from '#/data-layer/registrations';
import { createClaimSchema, type CreateClaimFormValues } from '#/schemas/claim.schema';
import type { CreateClaimPayload } from '#/types/claims.types';
import type { RegistrationPaintPair } from '#/types/registrations';

interface AddClaimModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateClaimPayload) => void;
}

const NO_BASECOAT_OPTION_VALUE = 'NONE';
const EMPTY_PAINT_PAIRS: RegistrationPaintPair[] = [];

const ISSUE_TYPE_OPTIONS: ReadonlyArray<{ label: string; value: CreateClaimFormValues['issueType'] }> = [
  { label: 'Peeling / Cracking', value: 'PEELING_CRACKING' },
  { label: 'Color Fading', value: 'COLOR_FADING' },
  { label: 'Algae / Fungus', value: 'ALGAE_FUNGUS' },
  { label: 'Water Ingress', value: 'WATER_INGRESS' },
  { label: 'Coverage Variance', value: 'COVERAGE_VARIANCE' },
  { label: 'Non-uniform Finish', value: 'NON_UNIFORM_FINISH' },
  { label: 'Others', value: 'OTHERS' },
];

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
 * AddClaimModal captures all fields required for creating a warranty claim.
 *
 * @param props - Modal visibility, submit and close handlers.
 * @returns Add-claim modal.
 */
export const AddClaimModal = ({ isOpen, isSubmitting, onClose, onSubmit }: AddClaimModalProps): JSX.Element => {
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
      basecoatProductId: NO_BASECOAT_OPTION_VALUE,
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

  const registrationOptions = useMemo(() => {
    return (registrationsQuery.data?.results ?? []).map(registration => ({
      id: String(registration.id),
      label: `${registration.registrationCode} - ${registration.customerName}`,
    }));
  }, [registrationsQuery.data?.results]);

  const topcoatOptions = useMemo(() => {
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

  const basecoatOptions = useMemo(() => {
    if (selectedTopcoatId === null) {
      return {
        hasNoBasecoat: false,
        items: [] as Array<{ id: string; label: string }>,
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

  const selectedPaintPairId = useMemo(() => {
    if (!registrationDetailQuery.data) {
      return '';
    }

    const selectedTopcoatId = toNumericId(topcoatProductId);
    const normalizedBasecoatValue = basecoatProductId ?? NO_BASECOAT_OPTION_VALUE;
    const selectedBasecoatId =
      normalizedBasecoatValue === NO_BASECOAT_OPTION_VALUE ? null : toNumericId(normalizedBasecoatValue);

    if (
      selectedTopcoatId === null ||
      (normalizedBasecoatValue !== NO_BASECOAT_OPTION_VALUE && selectedBasecoatId === null)
    ) {
      return '';
    }

    const matchingPaintPair = registrationDetailQuery.data.paintPairs.find(pair => {
      const currentBasecoatId = pair.basecoat?.id ?? null;
      return pair.topcoat.id === selectedTopcoatId && currentBasecoatId === selectedBasecoatId;
    });

    return matchingPaintPair ? String(matchingPaintPair.id) : '';
  }, [registrationPaintPairs, topcoatProductId, basecoatProductId]);

  useEffect(() => {
    setValue('paintPairId', selectedPaintPairId, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  }, [selectedPaintPairId, setValue]);

  useEffect(() => {
    setValue('topcoatProductId', '', { shouldDirty: false, shouldTouch: false, shouldValidate: true });
    setValue('basecoatProductId', NO_BASECOAT_OPTION_VALUE, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
    setValue('paintPairId', '', { shouldDirty: false, shouldTouch: false, shouldValidate: true });
  }, [registrationId, setValue]);

  useEffect(() => {
    setValue('basecoatProductId', NO_BASECOAT_OPTION_VALUE, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
    setValue('paintPairId', '', { shouldDirty: false, shouldTouch: false, shouldValidate: true });
  }, [topcoatProductId, setValue]);

  useEffect(() => {
    if (!isNoBasecoatFlow) {
      return;
    }

    setValue('basecoatProductId', NO_BASECOAT_OPTION_VALUE, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
    clearErrors('basecoatProductId');
  }, [clearErrors, isNoBasecoatFlow, setValue]);

  const handleOpenChange = (open: boolean): void => {
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
      notes: values.notes.trim(),
      photos: {
        longShot: values.longShotPhoto,
        closeShot: values.closeShotPhoto,
        alternateAngle: values.alternateAnglePhoto,
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='border-primary/20 bg-white'>
        <DialogHeader>
          <DialogTitle>Add New Claim</DialogTitle>
          <DialogDescription>
            Select approved registration + products, upload 3 photos, and create a warranty claim.
          </DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <label htmlFor='claim-registration' className='text-sm font-medium text-text-primary'>
                Approved Registration <span className='text-destructive'>*</span>
              </label>
              <Controller
                control={control}
                name='registrationId'
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id='claim-registration'>
                      <SelectValue
                        placeholder={registrationsQuery.isLoading ? 'Loading registrations...' : 'Select registration'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {registrationOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.registrationId ? (
                <p className='text-xs text-destructive'>{errors.registrationId.message}</p>
              ) : null}
            </div>

            <div className='space-y-2'>
              <label htmlFor='claim-issue-type' className='text-sm font-medium text-text-primary'>
                Issue Type <span className='text-destructive'>*</span>
              </label>
              <Controller
                control={control}
                name='issueType'
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id='claim-issue-type'>
                      <SelectValue placeholder='Select issue type' />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_TYPE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.issueType ? <p className='text-xs text-destructive'>{errors.issueType.message}</p> : null}
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <label htmlFor='claim-topcoat' className='text-sm font-medium text-text-primary'>
                Topcoat Product <span className='text-destructive'>*</span>
              </label>
              <Controller
                control={control}
                name='topcoatProductId'
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id='claim-topcoat'>
                      <SelectValue
                        placeholder={
                          registrationId
                            ? registrationDetailQuery.isLoading
                              ? 'Loading topcoats...'
                              : 'Select topcoat'
                            : 'Select registration first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {topcoatOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.topcoatProductId ? (
                <p className='text-xs text-destructive'>{errors.topcoatProductId.message}</p>
              ) : null}
            </div>

            <div className='space-y-2'>
              <label htmlFor='claim-basecoat' className='text-sm font-medium text-text-primary'>
                Basecoat Product
              </label>
              <Controller
                control={control}
                name='basecoatProductId'
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id='claim-basecoat' disabled={isNoBasecoatFlow}>
                      <SelectValue
                        placeholder={
                          topcoatProductId
                            ? registrationDetailQuery.isLoading
                              ? 'Loading basecoats...'
                              : 'Select basecoat'
                            : 'Select topcoat first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {basecoatOptions.hasNoBasecoat ? (
                        <SelectItem value={NO_BASECOAT_OPTION_VALUE}>No basecoat</SelectItem>
                      ) : null}
                      {basecoatOptions.items.map(option => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.basecoatProductId ? (
                <p className='text-xs text-destructive'>{errors.basecoatProductId.message}</p>
              ) : null}
              {isNoBasecoatFlow ? (
                <p className='text-xs text-text-muted'>
                  No basecoat is required for this selected topcoat in the approved registration.
                </p>
              ) : null}
            </div>
          </div>

          {registrationId && topcoatProductId ? (
            <p className={selectedPaintPairId ? 'text-xs text-text-muted' : 'text-xs text-destructive'}>
              {selectedPaintPairId
                ? 'Matching registration paint pair found.'
                : 'No matching paint pair found for selected registration + topcoat/basecoat.'}
            </p>
          ) : null}
          {errors.paintPairId ? <p className='text-xs text-destructive'>{errors.paintPairId.message}</p> : null}

          <div className='space-y-2'>
            <label htmlFor='claim-area' className='text-sm font-medium text-text-primary'>
              Affected Area (sq ft) <span className='text-destructive'>*</span>
            </label>
            <Input
              id='claim-area'
              type='number'
              step='0.01'
              inputMode='decimal'
              className='rounded-xl border-primary/20 bg-white'
              {...register('affectedAreaSqft')}
              aria-invalid={Boolean(errors.affectedAreaSqft)}
            />
            {errors.affectedAreaSqft ? (
              <p className='text-xs text-destructive'>{errors.affectedAreaSqft.message}</p>
            ) : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='claim-notes' className='text-sm font-medium text-text-primary'>
              Notes <span className='text-destructive'>*</span>
            </label>
            <Textarea
              id='claim-notes'
              className='rounded-xl border-primary/20 bg-white'
              {...register('notes')}
              aria-invalid={Boolean(errors.notes)}
            />
            {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            <label className='space-y-2'>
              <span className='block whitespace-nowrap text-sm font-medium text-text-primary'>
                Long Shot <span className='text-destructive'>*</span>
              </span>
              <Input
                type='file'
                className='rounded-xl border-primary/20 bg-white file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-primary'
                accept='.jpg,.jpeg,.png,.webp'
                onChange={handleLongShotChange}
              />
              {longShotPhoto ? <p className='text-xs text-text-muted'>Selected: {longShotPhoto.name}</p> : null}
              {errors.longShotPhoto ? <p className='text-xs text-destructive'>{errors.longShotPhoto.message}</p> : null}
            </label>

            <label className='space-y-2'>
              <span className='block whitespace-nowrap text-sm font-medium text-text-primary'>
                Close Shot <span className='text-destructive'>*</span>
              </span>
              <Input
                type='file'
                className='rounded-xl border-primary/20 bg-white file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-primary'
                accept='.jpg,.jpeg,.png,.webp'
                onChange={handleCloseShotChange}
              />
              {closeShotPhoto ? <p className='text-xs text-text-muted'>Selected: {closeShotPhoto.name}</p> : null}
              {errors.closeShotPhoto ? (
                <p className='text-xs text-destructive'>{errors.closeShotPhoto.message}</p>
              ) : null}
            </label>

            <label className='space-y-2'>
              <span className='block whitespace-nowrap text-sm font-medium text-text-primary'>
                Alternate Angle <span className='text-destructive'>*</span>
              </span>
              <Input
                type='file'
                className='rounded-xl border-primary/20 bg-white file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-primary'
                accept='.jpg,.jpeg,.png,.webp'
                onChange={handleAlternateAngleChange}
              />
              {alternateAnglePhoto ? (
                <p className='text-xs text-text-muted'>Selected: {alternateAnglePhoto.name}</p>
              ) : null}
              {errors.alternateAnglePhoto ? (
                <p className='text-xs text-destructive'>{errors.alternateAnglePhoto.message}</p>
              ) : null}
            </label>
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type='submit'
              className='rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white hover:brightness-105'
              disabled={isSubmitting || !selectedPaintPairId}
            >
              {isSubmitting ? 'Creating...' : 'Create Claim'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
