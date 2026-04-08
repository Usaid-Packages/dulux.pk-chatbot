import type { JSX } from 'react';

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
import { qualityApproveSchema, type QualityApproveFormValues } from '#/schemas/quality.schema';
import type { QualityDetail } from '#/types/quality.types';
import { createClaimApprovedTemplate } from '#/utils';

interface ApproveClaimModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  claim: QualityDetail;
  onClose: () => void;
  onSubmit: (values: QualityApproveFormValues) => void;
}

/**
 * ApproveClaimModal captures QA technical assessment and approval notes.
 *
 * @param props - Modal open state and submit handler.
 * @returns QA approve modal.
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
    reset,
    watch,
    formState: { errors },
  } = useForm<QualityApproveFormValues>({
    resolver: zodResolver(qualityApproveSchema),
    defaultValues: {
      technicalNotes: '',
    },
  });
  const technicalNotes = watch('technicalNotes') ?? '';
  const previewHtml = createClaimApprovedTemplate(
    claim,
    technicalNotes.trim() || 'Claim approved after quality review.'
  );

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      reset();
      onClose();
    }
  };

  const handleFormSubmit = (values: QualityApproveFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='flex max-h-[80vh] flex-col overflow-hidden border-primary/20 bg-[linear-gradient(170deg,#ffffff_0%,#f1f7ff_100%)] sm:max-w-[700px]'>
        <DialogHeader>
          <DialogTitle>Approve Claim (Quality)</DialogTitle>
          <DialogDescription>Provide technical notes and review customer email before QA approval.</DialogDescription>
        </DialogHeader>

        <form className='flex min-h-0 flex-1 flex-col' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
            <div className='space-y-2'>
              <label htmlFor='qa-approval-notes' className='text-sm font-medium text-text-primary'>
                Technical Notes
              </label>
              <Textarea
                id='qa-approval-notes'
                className='rounded-xl border-primary/20 bg-white'
                {...register('technicalNotes')}
                aria-invalid={Boolean(errors.technicalNotes)}
              />
              {errors.technicalNotes ? (
                <p className='text-xs text-destructive'>{errors.technicalNotes.message}</p>
              ) : null}
            </div>

            <div className='rounded-xl border border-primary/20 bg-primary/5 p-3'>
              <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>Outcome Summary</p>
              <p className='mt-1 text-sm text-text-primary'>
                This claim will move to approved state with QA decision history recorded.
              </p>
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-text-primary'>Email Preview</p>
              <p className='text-xs text-text-muted'>This is the customer email template sent on quality approval.</p>
              <div className='overflow-hidden rounded-xl border border-primary/15 bg-white'>
                <iframe
                  title='Quality approval email preview'
                  className='h-56 w-full'
                  sandbox=''
                  srcDoc={previewHtml}
                />
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
              {isSubmitting ? 'Submitting...' : 'Approve Claim'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
