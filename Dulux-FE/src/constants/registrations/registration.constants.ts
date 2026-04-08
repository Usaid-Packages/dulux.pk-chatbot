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
  { id: 'customer_name', label: 'Full Name', hint: 'Customer full name' },
  { id: 'email', label: 'Email', hint: 'Customer email address' },
  { id: 'city', label: 'City', hint: 'Project city' },
  { id: 'province', label: 'Province', hint: 'Project province' },
  { id: 'site_address', label: 'Site Address', hint: 'Project site address' },
  { id: 'purchase_date', label: 'Purchase Date', hint: 'Purchase invoice date' },
  { id: 'purchase_dealer', label: 'Dealer Name', hint: 'Dealer name' },
  { id: 'purchase_dealer_city', label: 'Dealer City', hint: 'Dealer city' },
  { id: 'purchase_dealer_address', label: 'Dealer Address', hint: 'Dealer address' },
  { id: 'paint_pairs', label: 'Paint Details', hint: 'Topcoat and basecoat details' },
  { id: 'paint_pair_invoices', label: 'Invoice Photos', hint: 'Uploaded invoice images' },
] as const;
