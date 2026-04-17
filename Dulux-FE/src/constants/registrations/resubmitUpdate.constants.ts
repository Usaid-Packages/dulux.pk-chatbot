import type { RegistrationRejectionField } from '#/types/registrations';

export const RESUBMIT_FIELD_LABELS: Record<RegistrationRejectionField['fieldName'], string> = {
  customer_name: 'Full Name',
  phone_number: 'Phone Number',
  email: 'Email',
  city: 'City',
  province: 'Province',
  site_address: 'Site Address',
  purchase_date: 'Purchase Date',
  purchase_dealer: 'Dealer Name',
  purchase_dealer_city: 'Dealer City',
  purchase_dealer_address: 'Dealer Address',
  postal_code: 'Postal Code',
  paint_pairs: 'Paint Details',
  paint_pair_invoices: 'Invoice Photos',
};

export const REQUESTED_FIELD_ORDER: RegistrationRejectionField['fieldName'][] = [
  'customer_name',
  'phone_number',
  'email',
  'city',
  'province',
  'site_address',
  'purchase_date',
  'purchase_dealer',
  'purchase_dealer_city',
  'purchase_dealer_address',
  'postal_code',
  'paint_pairs',
  'paint_pair_invoices',
];

export const CITY_MAX_LENGTH = 80;
export const DEALER_NAME_MAX_LENGTH = 120;
export const DEALER_CITY_MAX_LENGTH = 80;
export const DEALER_ADDRESS_MAX_LENGTH = 180;

export const SELECT_TOPCOAT_FIRST_TEXT = 'Select a topcoat first';
export const NO_BASECOAT_AVAILABLE_TEXT = 'No basecoat available for selected topcoat';
export const PHONE_PLACEHOLDER = '92XXXXXXXXXX';
