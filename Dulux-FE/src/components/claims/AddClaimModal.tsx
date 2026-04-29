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
import { CLAIM_ISSUE_TYPE_OPTIONS, CLAIM_NO_BASECOAT_OPTION_VALUE } from '#/constants';
import { useAddClaimForm } from '#/hooks/claims';
import type { CreateClaimPayload } from '#/types/claims.types';
import {
  AddClaimDetailsSection,
  AddClaimPhotosSection,
  AddClaimProductsSection,
  AddClaimRegistrationIssueSection,
} from './addClaim';

interface AddClaimModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateClaimPayload) => void;
}

/**
 * AddClaimModal captures all fields required for creating a warranty claim.
 *
 * @param props - Modal visibility, submit and close handlers.
 * @returns Add-claim modal.
 */
export const AddClaimModal = ({ isOpen, isSubmitting, onClose, onSubmit }: AddClaimModalProps): JSX.Element => {
  const {
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
    isRegistrationDetailLoading,
    isRegistrationSelected,
    isSpecialistTopcoatSelected,
    isRegistrationsLoading,
    isTopcoatSelectDisabled,
    longShotPhoto,
    registrationId,
    registrationOptions,
    register,
    selectedPaintPairId,
    topcoatOptions,
    topcoatProductId,
  } = useAddClaimForm({
    onClose,
    onSubmit,
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogContent className='border-primary/20 bg-white'>
        <DialogHeader>
          <DialogTitle>Add New Claim</DialogTitle>
          <DialogDescription>
            Select approved registration + products, upload 3 photos, and create a warranty claim.
          </DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <AddClaimRegistrationIssueSection
            control={control}
            errors={errors}
            issueTypeOptions={CLAIM_ISSUE_TYPE_OPTIONS}
            isRegistrationsLoading={isRegistrationsLoading}
            registrationOptions={registrationOptions}
          />

          <AddClaimProductsSection
            basecoatOptions={basecoatOptions}
            control={control}
            errors={errors}
            hasTopcoatSelection={hasTopcoatSelection}
            isBasecoatSelectDisabled={isBasecoatSelectDisabled}
            isNoBasecoatFlow={isNoBasecoatFlow}
            isRegistrationDetailLoading={isRegistrationDetailLoading}
            isRegistrationSelected={isRegistrationSelected}
            isSpecialistTopcoatSelected={isSpecialistTopcoatSelected}
            isTopcoatSelectDisabled={isTopcoatSelectDisabled}
            noBasecoatOptionValue={CLAIM_NO_BASECOAT_OPTION_VALUE}
            onTopcoatChange={handleTopcoatChange}
            registrationId={registrationId}
            selectedPaintPairId={selectedPaintPairId}
            topcoatOptions={topcoatOptions}
            topcoatProductId={topcoatProductId}
          />

          <AddClaimDetailsSection errors={errors} register={register} />

          <AddClaimPhotosSection
            alternateAnglePhoto={alternateAnglePhoto}
            closeShotPhoto={closeShotPhoto}
            errors={errors}
            longShotPhoto={longShotPhoto}
            onAlternateAngleChange={handleAlternateAngleChange}
            onCloseShotChange={handleCloseShotChange}
            onLongShotChange={handleLongShotChange}
          />

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type='submit'
              variant='primaryGradient'
              className='rounded-xl'
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
