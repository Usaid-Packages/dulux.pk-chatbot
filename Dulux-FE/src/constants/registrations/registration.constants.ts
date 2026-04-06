import type { RegistrationFilterTab, RegistrationStatus } from '#/types/registrations';

export const REGISTRATION_HTTP_METHODS = {
  PATCH: 'patch',
} as const;

export const REGISTRATION_ACTIONS = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  RESUBMIT: 'RESUBMIT',
} as const;

export const REGISTRATION_PRODUCT_TYPES = {
  TOPCOAT: 'TOPCOAT',
  BASECOAT: 'BASECOAT',
} as const;

export const REGISTRATION_INVOICE_TYPES = {
  TOPCOAT: 'TOPCOAT',
  BASECOAT: 'BASECOAT',
} as const;

export const REGISTRATION_TAB_TO_STATUS: Record<RegistrationFilterTab, RegistrationStatus | undefined> = {
  All: undefined,
  Pending: 'SUBMITTED',
  Approved: 'APPROVED',
  Rejected: 'REJECTED',
  Resubmission: 'RESUBMIT',
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  SUBMITTED: 'Pending',
  IN_PROGRESS: 'In Progress',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RESUBMIT: 'Resubmission',
};

export const REGISTRATION_CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  WEB: 'Web',
  WEBFORM: 'Manual',
};

export const RESUBMISSION_FIELDS = [
  { id: 'personal_info', label: 'Personal Information', hint: 'Name, Email, City, Address' },
  { id: 'purchase_date', label: 'Purchase Date', hint: 'Date of purchase' },
  { id: 'dealer_info', label: 'Dealer Information', hint: 'Dealer name & location' },
  { id: 'product_details', label: 'Product Details', hint: 'Topcoat/Basecoat & quantities' },
  { id: 'topcoat_invoice', label: 'Topcoat Invoice', hint: 'Invoice image' },
  { id: 'basecoat_invoice', label: 'Basecoat Invoice', hint: 'Invoice image' },
] as const;

export const REJECT_REASONS = [
  'Incomplete customer profile',
  'Purchase date is invalid',
  'Dealer information mismatch',
  'Product details mismatch',
  'Invoice unreadable',
  'Policy violation',
] as const;
