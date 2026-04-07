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
import {
  useGetManualRegistrationProductsQuery,
  useGetRegistrationByIdQuery,
  useGetRegistrationsQuery,
} from '#/data-layer/registrations';
import { createClaimSchema, type CreateClaimFormValues } from '#/schemas/claim.schema';
import type { CreateClaimPayload } from '#/types/claims.types';

interface AddClaimModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateClaimPayload) => void;
}

const NO_BASECOAT_OPTION_VALUE = 'NONE';

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
  const productsQuery = useGetManualRegistrationProductsQuery();

  const {
    register,
    control,
    setValue,
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

  const registrationOptions = useMemo(() => {
    return (registrationsQuery.data?.results ?? []).map(registration => ({
      id: String(registration.id),
      label: `${registration.registrationCode} - ${registration.customerName}`,
    }));
  }, [registrationsQuery.data?.results]);

  const selectedPaintPairId = useMemo(() => {
    if (!registrationDetailQuery.data) {
      return '';
    }

    const selectedTopcoatId = toNumericId(topcoatProductId);
    const selectedBasecoatId = basecoatProductId === NO_BASECOAT_OPTION_VALUE ? null : toNumericId(basecoatProductId);

    if (selectedTopcoatId === null || (basecoatProductId !== NO_BASECOAT_OPTION_VALUE && selectedBasecoatId === null)) {
      return '';
    }

    const matchingPaintPair = registrationDetailQuery.data.paintPairs.find(pair => {
      const currentBasecoatId = pair.basecoat?.id ?? null;
      return pair.topcoat.id === selectedTopcoatId && currentBasecoatId === selectedBasecoatId;
    });

    return matchingPaintPair ? String(matchingPaintPair.id) : '';
  }, [registrationDetailQuery.data, topcoatProductId, basecoatProductId]);

  useEffect(() => {
    setValue('paintPairId', selectedPaintPairId, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  }, [selectedPaintPairId, setValue]);

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
    const paintPairNumericId = toNumericId(values.paintPairId);

    if (!registrationNumericId || !paintPairNumericId) {
      return;
    }

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
      <DialogContent>
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
                Approved Registration
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
                Issue Type
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
                Topcoat Product
              </label>
              <Controller
                control={control}
                name='topcoatProductId'
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id='claim-topcoat'>
                      <SelectValue placeholder={productsQuery.isLoading ? 'Loading topcoats...' : 'Select topcoat'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(productsQuery.data?.topcoatProducts ?? []).map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.label}
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
                    <SelectTrigger id='claim-basecoat'>
                      <SelectValue placeholder={productsQuery.isLoading ? 'Loading basecoats...' : 'Select basecoat'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_BASECOAT_OPTION_VALUE}>No basecoat</SelectItem>
                      {(productsQuery.data?.basecoatProducts ?? []).map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.basecoatProductId ? (
                <p className='text-xs text-destructive'>{errors.basecoatProductId.message}</p>
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
              Affected Area (sq ft)
            </label>
            <Input
              id='claim-area'
              type='number'
              step='0.01'
              inputMode='decimal'
              {...register('affectedAreaSqft')}
              aria-invalid={Boolean(errors.affectedAreaSqft)}
            />
            {errors.affectedAreaSqft ? (
              <p className='text-xs text-destructive'>{errors.affectedAreaSqft.message}</p>
            ) : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='claim-notes' className='text-sm font-medium text-text-primary'>
              Notes
            </label>
            <Textarea id='claim-notes' {...register('notes')} aria-invalid={Boolean(errors.notes)} />
            {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            <label className='space-y-2'>
              <span className='block whitespace-nowrap text-sm font-medium text-text-primary'>Long Shot</span>
              <Input type='file' accept='.jpg,.jpeg,.png,.webp' onChange={handleLongShotChange} />
              {longShotPhoto ? <p className='text-xs text-text-muted'>Selected: {longShotPhoto.name}</p> : null}
              {errors.longShotPhoto ? <p className='text-xs text-destructive'>{errors.longShotPhoto.message}</p> : null}
            </label>

            <label className='space-y-2'>
              <span className='block whitespace-nowrap text-sm font-medium text-text-primary'>Close Shot</span>
              <Input type='file' accept='.jpg,.jpeg,.png,.webp' onChange={handleCloseShotChange} />
              {closeShotPhoto ? <p className='text-xs text-text-muted'>Selected: {closeShotPhoto.name}</p> : null}
              {errors.closeShotPhoto ? (
                <p className='text-xs text-destructive'>{errors.closeShotPhoto.message}</p>
              ) : null}
            </label>

            <label className='space-y-2'>
              <span className='block whitespace-nowrap text-sm font-medium text-text-primary'>Alternate Angle</span>
              <Input type='file' accept='.jpg,.jpeg,.png,.webp' onChange={handleAlternateAngleChange} />
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
              disabled={isSubmitting || Boolean(registrationDetailQuery.isFetching && registrationId)}
            >
              {isSubmitting ? 'Creating...' : 'Create Claim'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
