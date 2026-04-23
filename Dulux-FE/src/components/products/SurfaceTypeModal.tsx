import type { JSX } from 'react';
import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

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
import { SURFACE_TYPE_FORM_MAX_LENGTHS } from '#/constants';
import { useDialogLifecycle } from '#/hooks/common/useDialogLifecycle';
import { surfaceTypeFormSchema, type SurfaceTypeFormSchemaValues } from '#/schemas/products';
import { productEnvironments, type SurfaceTypeFormValues } from '#/types/products';

interface SurfaceTypeModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  title: string;
  description: string;
  initialValues?: SurfaceTypeFormValues;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (values: SurfaceTypeFormValues) => void;
}

const DEFAULT_VALUES: SurfaceTypeFormValues = {
  name: '',
  environment: 'INTERIOR',
  description: '',
  status: 'ACTIVE',
};

/**
 * SurfaceTypeModal captures create/edit input for a single surface type.
 *
 * @param props - Modal visibility, initial values, submit state, and close/submit handlers.
 * @returns Surface-type form dialog.
 */
export const SurfaceTypeModal = ({
  isOpen,
  isSubmitting,
  title,
  description,
  initialValues,
  submitLabel,
  onClose,
  onSubmit,
}: SurfaceTypeModalProps): JSX.Element => {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SurfaceTypeFormSchemaValues>({
    resolver: zodResolver(surfaceTypeFormSchema),
    defaultValues: initialValues ?? DEFAULT_VALUES,
  });

  useEffect(() => {
    if (isOpen) {
      reset(initialValues ?? DEFAULT_VALUES);
    }
  }, [initialValues, isOpen, reset]);

  const handleSurfaceTypeModalReset = (): void => {
    reset(initialValues ?? DEFAULT_VALUES);
  };

  const { handleDialogOpenChange } = useDialogLifecycle({
    onClose,
    onReset: handleSurfaceTypeModalReset,
  });

  const handleFormSubmit = (values: SurfaceTypeFormSchemaValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className='border-primary/20 bg-white'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='space-y-2'>
            <label htmlFor='surface-name' className='text-sm font-medium text-text-primary'>
              Surface Name <span className='text-destructive'>*</span>
            </label>
            <Input
              id='surface-name'
              className='rounded-xl border-primary/20 bg-white'
              placeholder='e.g. Concrete, Plaster, Tile...'
              maxLength={SURFACE_TYPE_FORM_MAX_LENGTHS.name}
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
            />
            <p className='text-xs text-text-muted'>Maximum {SURFACE_TYPE_FORM_MAX_LENGTHS.name} characters allowed.</p>
            {errors.name ? <p className='text-xs text-destructive'>{errors.name.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='surface-environment' className='text-sm font-medium text-text-primary'>
              Category <span className='text-destructive'>*</span>
            </label>
            <Controller
              control={control}
              name='environment'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='surface-environment'>
                    <SelectValue placeholder='Select category' />
                  </SelectTrigger>
                  <SelectContent>
                    {productEnvironments.map(environment => (
                      <SelectItem key={environment} value={environment}>
                        {environment === 'INTERIOR' ? 'Interior' : 'Exterior'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.environment ? <p className='text-xs text-destructive'>{errors.environment.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='surface-description' className='text-sm font-medium text-text-primary'>
              Description
            </label>
            <Textarea
              id='surface-description'
              rows={3}
              className='rounded-xl border-primary/20 bg-white'
              placeholder='Optional description for this surface type...'
              {...register('description')}
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? <p className='text-xs text-destructive'>{errors.description.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='surface-status' className='text-sm font-medium text-text-primary'>
              Status
            </label>
            <Controller
              control={control}
              name='status'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='surface-status'>
                    <SelectValue placeholder='Select status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ACTIVE'>Active</SelectItem>
                    <SelectItem value='INACTIVE'>Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status ? <p className='text-xs text-destructive'>{errors.status.message}</p> : null}
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' variant='primaryGradient' className='rounded-xl' disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
