import type { JSX } from 'react';

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
  Textarea,
} from '#/components/ui';
import { NOTES_MAX_LENGTH, NOTES_MAX_LENGTH_HELPER_TEXT } from '#/constants';
import { approveClaimFinalSchema, type ApproveClaimFinalFormValues } from '#/schemas/claim.schema';
import type { ClaimDetail } from '#/types/claims.types';
import { createClaimApprovedTemplate } from '#/utils';

interface ApproveClaimModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  claim: ClaimDetail;
  onClose: () => void;
  onSubmit: (values: ApproveClaimFinalFormValues) => void;
}

/**
 * ApproveClaimModal captures final approval notes, voucher upload, and customer email preview.
 *
 * @param props - Modal state and submit callback.
 * @returns Final claim-approval modal.
 */
export const ApproveClaimModal = ({
  isOpen,
  isSubmitting,
  claim,
  onClose,
  onSubmit,
}: ApproveClaimModalProps): JSX.Element => {
  const {
    handleSubmit,
    register,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<ApproveClaimFinalFormValues>({
    resolver: zodResolver(approveClaimFinalSchema),
    defaultValues: {
      notes: '',
    },
  });

  const notes = watch('notes') ?? '';
  const voucher = watch('voucher');
  const previewHtml = createClaimApprovedTemplate(claim, notes.trim() || 'Claim approved after final review.');

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      reset();
      onClose();
    }
  };

  const handleFormSubmit = (values: ApproveClaimFinalFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='flex max-h-[80vh] flex-col overflow-hidden border-primary/20 bg-white sm:max-w-[700px]'>
        <DialogHeader>
          <DialogTitle>Final Approve Claim</DialogTitle>
          <DialogDescription>
            Upload voucher and review the customer email template before final approval.
          </DialogDescription>
        </DialogHeader>

        <form className='flex min-h-0 flex-1 flex-col' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
            <div className='space-y-2'>
              <label htmlFor='claim-approval-notes' className='text-sm font-medium text-text-primary'>
                Final Notes (Optional)
              </label>
              <Textarea
                id='claim-approval-notes'
                className='rounded-xl border-primary/20 bg-white'
                maxLength={NOTES_MAX_LENGTH}
                {...register('notes')}
                aria-invalid={Boolean(errors.notes)}
              />
              <p className='text-xs text-text-muted'>{NOTES_MAX_LENGTH_HELPER_TEXT}</p>
              {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
            </div>

            <div className='space-y-2'>
              <label htmlFor='claim-voucher-file' className='text-sm font-medium text-text-primary'>
                Voucher File <span className='text-destructive'>*</span>
              </label>
              <Controller
                name='voucher'
                control={control}
                render={({ field }) => (
                  <Input
                    id='claim-voucher-file'
                    ref={field.ref}
                    type='file'
                    className='rounded-xl border-primary/20 bg-white file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-primary'
                    accept='.pdf,.png,.jpg,.jpeg'
                    onChange={event => {
                      const voucherFile = event.target.files?.[0];
                      if (!voucherFile) {
                        return;
                      }
                      field.onChange(voucherFile);
                    }}
                    onBlur={field.onBlur}
                  />
                )}
              />
              {voucher ? (
                <span className='inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-text-primary'>
                  Selected: {voucher.name}
                </span>
              ) : null}
              {errors.voucher ? <p className='text-xs text-destructive'>{errors.voucher.message}</p> : null}
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-text-primary'>Email Preview</p>
              <p className='text-xs text-text-muted'>This is the customer email template sent on final approval.</p>
              <div className='overflow-hidden rounded-xl border border-primary/15 bg-white'>
                <iframe title='Claim approval email preview' className='h-56 w-full' sandbox='' srcDoc={previewHtml} />
              </div>
            </div>
          </div>

          <DialogFooter className='mt-3 border-t border-primary/10 pt-3'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type='submit'
              className='rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white hover:brightness-105'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Final Approve Claim'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
