import type { JSX } from 'react';
import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '#/components/ui';
import { useClaimCsrResubmission } from '#/hooks/claims';
import { claimCsrResubmissionFormSchema } from '#/schemas/claim.schema';
import type { ClaimCsrResubmissionFormValues } from '#/schemas/claim.schema';
import { CsrResubmissionEntryField } from './CsrResubmissionEntryField';

interface CsrResubmissionModalProps {
  claimId: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ClaimCsrResubmissionFormValues) => void;
}

/**
 * CsrResubmissionModal renders QA-requested resubmission fields for CSR-assisted submission.
 *
 * @param props - Modal state and submit handlers.
 * @returns CSR resubmission form modal.
 */
export const CsrResubmissionModal = ({
  claimId,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: CsrResubmissionModalProps): JSX.Element => {
  const csrResubmissionRequestQuery = useClaimCsrResubmission(claimId, isOpen);

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<ClaimCsrResubmissionFormValues>({
    resolver: zodResolver(claimCsrResubmissionFormSchema),
    defaultValues: {
      notes: '',
      entries: [],
    },
  });

  useEffect(() => {
    if (!isOpen || !csrResubmissionRequestQuery.data) {
      return;
    }

    reset({
      notes: '',
      entries: csrResubmissionRequestQuery.data.requestedItems.map(item => ({
        requiredItem: item.requiredItem,
        inputType: item.inputType,
        responseText: '',
        imageFile: undefined,
      })),
    });
  }, [csrResubmissionRequestQuery.data, isOpen, reset]);

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      reset({
        notes: '',
        entries: [],
      });
      onClose();
    }
  };

  const handleFormSubmit = (values: ClaimCsrResubmissionFormValues): void => {
    onSubmit(values);
  };

  const handleRetry = (): void => {
    void csrResubmissionRequestQuery.refetch();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='flex max-h-[82vh] flex-col overflow-hidden border-primary/20 bg-white sm:max-w-[700px]'>
        <DialogHeader>
          <DialogTitle>CSR Resubmission</DialogTitle>
          <DialogDescription>
            Upload all requested QA fields so this claim can move back to QA review.
          </DialogDescription>
        </DialogHeader>

        <form className='flex min-h-0 flex-1 flex-col' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
            {csrResubmissionRequestQuery.isLoading ? (
              <div className='space-y-2 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-text-muted'>
                <p>Loading requested resubmission fields...</p>
              </div>
            ) : null}

            {csrResubmissionRequestQuery.isError ? (
              <div className='space-y-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3'>
                <p className='text-sm text-destructive'>
                  {csrResubmissionRequestQuery.error?.message ?? 'Unable to load resubmission request.'}
                </p>
                <Button type='button' variant='outline' onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            ) : null}

            {csrResubmissionRequestQuery.data ? (
              <>
                <article className='rounded-xl border border-primary/15 bg-primary/5 p-3'>
                  <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Quality Notes</p>
                  <p className='mt-1 text-sm text-text-primary'>
                    {csrResubmissionRequestQuery.data.qualityNotes || 'No additional quality note provided.'}
                  </p>
                  {csrResubmissionRequestQuery.data.otherText ? (
                    <p className='mt-2 text-xs text-text-muted'>
                      Other details: {csrResubmissionRequestQuery.data.otherText}
                    </p>
                  ) : null}
                </article>

                <div className='space-y-3'>
                  {csrResubmissionRequestQuery.data.requestedItems.map((requestedItem, index) => (
                    <CsrResubmissionEntryField
                      key={requestedItem.requiredItem}
                      control={control}
                      errors={errors}
                      index={index}
                      register={register}
                      requestedItem={requestedItem}
                    />
                  ))}
                </div>

                <div className='space-y-2'>
                  <label htmlFor='csr-resubmission-notes' className='text-sm font-medium text-text-primary'>
                    CSR Notes (Optional)
                  </label>
                  <Textarea
                    id='csr-resubmission-notes'
                    rows={3}
                    className='rounded-xl border-primary/20 bg-white'
                    placeholder='Add context about how these details were collected...'
                    {...register('notes')}
                  />
                  {errors.notes?.message ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter className='mt-3 border-t border-primary/10 pt-3'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type='submit'
              className='rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white hover:brightness-105'
              disabled={isSubmitting || csrResubmissionRequestQuery.isLoading || csrResubmissionRequestQuery.isError}
            >
              {isSubmitting ? 'Submitting...' : 'Submit To QA'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
