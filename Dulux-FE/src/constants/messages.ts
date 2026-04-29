export const CLAIM_MESSAGES = {
  DETAIL_UNAVAILABLE: 'Claim detail is not available.',
  FORWARDED_TO_QUALITY: 'Claim forwarded to quality.',
  FINALIZED_APPROVED: 'Claim finalized as approved.',
  FINALIZED_REJECTED: 'Claim finalized as rejected.',
  RESUBMISSION_SUBMITTED: 'Resubmission submitted and claim moved to QA review.',
} as const;

export const QUALITY_MESSAGES = {
  TECHNICAL_APPROVAL_SUBMITTED: 'Technical approval submitted.',
  TECHNICAL_REJECTION_SUBMITTED: 'Technical rejection submitted.',
  INFORMATION_REQUEST_SENT: 'Information request sent.',
} as const;

export const REGISTRATION_MESSAGES = {
  APPROVED_SUCCESS: 'Registration approved successfully.',
  REJECTED_SUCCESS: 'Registration rejected successfully.',
  RESUBMISSION_REQUEST_SENT: 'Resubmission request sent successfully.',
  RESUBMISSION_FIELDS_UPDATED: 'Resubmission fields updated successfully.',
  RESUBMISSION_STATE_REQUIRED: 'Registration fields can only be updated in RESUBMIT state.',
} as const;

export const PRODUCT_MESSAGES = {
  CREATED_SUCCESS: 'Product created successfully.',
  UPDATED_SUCCESS: 'Product updated successfully.',
  IMAGE_REMOVED_SUCCESS: 'Product image removed.',
  SURFACE_TYPE_CREATED_SUCCESS: 'Surface type created successfully.',
  SURFACE_TYPE_UPDATED_SUCCESS: 'Surface type updated successfully.',
  SURFACE_TYPE_DELETED_SUCCESS: 'Surface type deleted successfully.',
} as const;
