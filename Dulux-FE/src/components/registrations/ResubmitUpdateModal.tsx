import type { JSX } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui';
import type { ResubmitUpdateFormValues } from '#/schemas/registrations';
import type { RegistrationDetail } from '#/types/registrations';
import {
  ResubmitUpdateCorrectionNotesSection,
  ResubmitUpdateGeneralFields,
  ResubmitUpdateInvoiceSection,
  ResubmitUpdatePaintPairsSection,
  useResubmitUpdateForm,
} from './resubmitUpdate';

interface ResubmitUpdateModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  registration: RegistrationDetail;
  onClose: () => void;
  onSubmit: (values: ResubmitUpdateFormValues) => void;
}

/**
 * ResubmitUpdateModal renders editable fields requested in registration RESUBMIT state.
 *
 * @param props - Dialog state, registration detail and submit handlers.
 * @returns Resubmit update modal component.
 */
export const ResubmitUpdateModal = ({
  isOpen,
  isSubmitting,
  registration,
  onClose,
  onSubmit,
}: ResubmitUpdateModalProps): JSX.Element => {
  const {
    requestedFieldNames,
    requestedCorrectionNotes,
    control,
    register,
    errors,
    handleSubmit,
    fields,
    watchedPaintPairs,
    topcoatProducts,
    basecoatOptionsByTopcoatId,
    isPaintProductsLoading,
    isPaintProductsError,
    paintProductsErrorMessage,
    handleCityChange,
    handlePurchaseDealerChange,
    handlePurchaseDealerCityChange,
    handlePhoneNumberChange,
    handlePhoneNumberFocus,
    handleModalClose,
    handleModalOpenChange,
    handleAddPaintPair,
    handleRemovePaintPair,
    buildInvoiceFilesChangeHandler,
  } = useResubmitUpdateForm({
    isOpen,
    registration,
    onClose,
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogContent className='flex max-h-[85vh] flex-col overflow-hidden border-primary/20 bg-white sm:max-w-[760px]'>
        <DialogHeader>
          <DialogTitle>Submit Resubmission Changes</DialogTitle>
          <DialogDescription>Update only the requested fields and send them back for review.</DialogDescription>
        </DialogHeader>

        <form className='flex min-h-0 flex-1 flex-col' onSubmit={handleSubmit(onSubmit)}>
          <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
            <ResubmitUpdateGeneralFields
              requestedFieldNames={requestedFieldNames}
              control={control}
              register={register}
              errors={errors}
              onCityChange={handleCityChange}
              onPurchaseDealerChange={handlePurchaseDealerChange}
              onPurchaseDealerCityChange={handlePurchaseDealerCityChange}
              onPhoneNumberChange={handlePhoneNumberChange}
              onPhoneNumberFocus={handlePhoneNumberFocus}
            />

            <ResubmitUpdatePaintPairsSection
              requestedFieldNames={requestedFieldNames}
              control={control}
              register={register}
              errors={errors}
              fields={fields}
              watchedPaintPairs={watchedPaintPairs}
              topcoatProducts={topcoatProducts}
              basecoatOptionsByTopcoatId={basecoatOptionsByTopcoatId}
              isPaintProductsLoading={isPaintProductsLoading}
              isPaintProductsError={isPaintProductsError}
              paintProductsErrorMessage={paintProductsErrorMessage}
              onAddPaintPair={handleAddPaintPair}
              onRemovePaintPair={handleRemovePaintPair}
            />

            <ResubmitUpdateInvoiceSection
              requestedFieldNames={requestedFieldNames}
              control={control}
              registration={registration}
              buildInvoiceFilesChangeHandler={buildInvoiceFilesChangeHandler}
            />

            <ResubmitUpdateCorrectionNotesSection notes={requestedCorrectionNotes} />
          </div>

          <DialogFooter className='mt-3 border-t border-primary/10 pt-3'>
            <Button type='button' variant='outline' onClick={handleModalClose}>
              Cancel
            </Button>
            <Button type='submit' variant='primaryGradient' className='rounded-xl' disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
