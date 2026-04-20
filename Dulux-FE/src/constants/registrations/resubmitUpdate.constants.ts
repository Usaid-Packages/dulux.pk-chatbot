import type { RegistrationRejectionField } from '#/types/registrations';
import type { ResubmissionFieldName } from '#/types/registrations';

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

export const APPROVAL_TEMPLATE_FALLBACK_NOTE = 'Approval confirmed.';
export const REJECTION_TEMPLATE_FALLBACK_NOTE = 'Rejected after review.';
export const REGISTRATION_DETAIL_UNAVAILABLE_MESSAGE = 'Registration detail is not available.';
export const TOPCOAT_INVOICE_TYPE = 'TOPCOAT';

type TrimmedResubmitPayloadField =
  | 'customerName'
  | 'phoneNumber'
  | 'email'
  | 'city'
  | 'province'
  | 'siteAddress'
  | 'purchaseDate'
  | 'purchaseDealer'
  | 'purchaseDealerCity'
  | 'purchaseDealerAddress'
  | 'postalCode';

type TrimmedResubmitValueField =
  | 'customerName'
  | 'phoneNumber'
  | 'email'
  | 'city'
  | 'province'
  | 'siteAddress'
  | 'purchaseDate'
  | 'purchaseDealer'
  | 'purchaseDealerCity'
  | 'purchaseDealerAddress'
  | 'postalCode';

export const TRIMMED_FIELD_MAPPINGS: ReadonlyArray<{
  payloadKey: TrimmedResubmitPayloadField;
  requestedFieldName: ResubmissionFieldName;
  valueKey: TrimmedResubmitValueField;
}> = [
  { requestedFieldName: 'customer_name', valueKey: 'customerName', payloadKey: 'customerName' },
  { requestedFieldName: 'phone_number', valueKey: 'phoneNumber', payloadKey: 'phoneNumber' },
  { requestedFieldName: 'email', valueKey: 'email', payloadKey: 'email' },
  { requestedFieldName: 'city', valueKey: 'city', payloadKey: 'city' },
  { requestedFieldName: 'province', valueKey: 'province', payloadKey: 'province' },
  { requestedFieldName: 'site_address', valueKey: 'siteAddress', payloadKey: 'siteAddress' },
  { requestedFieldName: 'purchase_date', valueKey: 'purchaseDate', payloadKey: 'purchaseDate' },
  { requestedFieldName: 'purchase_dealer', valueKey: 'purchaseDealer', payloadKey: 'purchaseDealer' },
  { requestedFieldName: 'purchase_dealer_city', valueKey: 'purchaseDealerCity', payloadKey: 'purchaseDealerCity' },
  {
    requestedFieldName: 'purchase_dealer_address',
    valueKey: 'purchaseDealerAddress',
    payloadKey: 'purchaseDealerAddress',
  },
  { requestedFieldName: 'postal_code', valueKey: 'postalCode', payloadKey: 'postalCode' },
];
