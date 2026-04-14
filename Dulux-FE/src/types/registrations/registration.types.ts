export const registrationStatuses = ['SUBMITTED', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'RESUBMIT'] as const;

export const registrationChannels = ['WHATSAPP', 'WEB', 'WEBFORM'] as const;

export const registrationFilterTabs = ['All', 'Pending', 'Approved', 'Rejected', 'Resubmission'] as const;

export type RegistrationStatus = (typeof registrationStatuses)[number];
export type RegistrationChannel = (typeof registrationChannels)[number];
export type RegistrationFilterTab = (typeof registrationFilterTabs)[number];

export interface RegistrationPaintPairProduct {
  id: number;
  name: string;
  productType: string;
}

export interface RegistrationPaintPair {
  id: number;
  topcoat: RegistrationPaintPairProduct;
  topcoatQuantity: string;
  basecoat: RegistrationPaintPairProduct | null;
  basecoatQuantity: string | null;
}

export interface RegistrationInvoiceImage {
  id: number;
  image: string;
}

export interface RegistrationInvoice {
  id: number;
  image: RegistrationInvoiceImage;
  invoiceType: 'TOPCOAT' | 'BASECOAT';
}

export interface RegistrationListItem {
  id: number;
  registrationCode: string;
  customerName: string;
  phoneNumber: string;
  city: string;
  channel: RegistrationChannel;
  state: RegistrationStatus;
  purchaseDate: string;
  created: string;
}

export interface RegistrationDetail {
  id: number;
  registrationCode: string;
  channel: RegistrationChannel;
  state: RegistrationStatus;
  customerName: string;
  phoneNumber: string;
  email: string;
  city: string;
  province: string;
  siteAddress: string;
  purchaseDate: string;
  purchaseDealer: string;
  purchaseDealerCity: string;
  purchaseDealerAddress: string;
  postalCode: string;
  notes: string;
  approvedBy: number | null;
  approvedByEmail: string | null;
  approvedAt: string | null;
  warrantyCertificate: string | null;
  paintPairs: RegistrationPaintPair[];
  paintPairInvoices: RegistrationInvoice[];
  rejectionFields: RegistrationRejectionField[];
  created: string;
  modified: string;
}

export interface RegistrationsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RegistrationListItem[];
}

export interface RegistrationCardCounts {
  totalRegistrations: number;
  pendingReview: number;
  approved: number;
}

export interface RegistrationsQueryParams extends Record<string, unknown> {
  search?: string;
  state?: RegistrationStatus;
  channel?: RegistrationChannel;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface ResubmissionFieldPayload {
  fieldName: ResubmissionFieldName;
  note?: string;
}

export type ResubmissionFieldName =
  | 'customer_name'
  | 'phone_number'
  | 'email'
  | 'city'
  | 'province'
  | 'site_address'
  | 'purchase_date'
  | 'purchase_dealer'
  | 'purchase_dealer_city'
  | 'purchase_dealer_address'
  | 'postal_code'
  | 'paint_pairs'
  | 'paint_pair_invoices';

export interface RegistrationRejectionField {
  id: number;
  fieldName: ResubmissionFieldName;
  note: string;
  created: string;
}

export interface RegistrationActionPayload extends Record<string, unknown> {
  action: 'APPROVE' | 'REJECT' | 'RESUBMIT';
  notes?: string;
  notificationTemplate?: string;
  rejectionFields?: ResubmissionFieldPayload[];
}

export interface RegistrationDetailApiPaintPair {
  id?: number;
  topcoat?: number;
  topcoatId?: number;
  topcoat_id?: number;
  topcoatName?: string;
  topcoat_name?: string;
  topcoatQuantity?: string;
  topcoat_quantity?: string;
  basecoat?: number | null;
  basecoatId?: number | null;
  basecoat_id?: number | null;
  basecoatName?: string | null;
  basecoat_name?: string | null;
  basecoatQuantity?: string | null;
  basecoat_quantity?: string | null;
}

export interface RegistrationDetailApiInvoice {
  id?: number;
  image?: {
    id?: number;
    image?: string;
  };
  invoiceType?: 'TOPCOAT' | 'BASECOAT';
}

export interface RegistrationDetailApiRejectionField {
  id?: number;
  fieldName?: ResubmissionFieldName;
  field_name?: ResubmissionFieldName;
  note?: string;
  created?: string;
}

export interface RegistrationDetailApiResponse {
  id?: number;
  registrationCode?: string;
  registrationNumber?: string;
  channel?: RegistrationChannel;
  state?: RegistrationStatus;
  customerName?: string;
  phoneNumber?: string;
  email?: string;
  city?: string;
  province?: string;
  siteAddress?: string;
  purchaseDate?: string;
  purchaseDealer?: string;
  purchaseDealerCity?: string;
  purchaseDealerAddress?: string;
  postalCode?: string;
  notes?: string;
  approvedBy?: number | null;
  approvedByEmail?: string | null;
  approvedAt?: string | null;
  warrantyCertificate?: string | null;
  created?: string;
  modified?: string;
  paintPairs?: RegistrationDetailApiPaintPair[];
  paint_pairs?: RegistrationDetailApiPaintPair[];
  paintPairInvoices?: RegistrationDetailApiInvoice[];
  paint_pair_invoices?: RegistrationDetailApiInvoice[];
  rejectionFields?: RegistrationDetailApiRejectionField[];
  rejection_fields?: RegistrationDetailApiRejectionField[];
}

export interface RegistrationResubmitUpdatePaintPair {
  topcoat: number;
  topcoatQuantity: string;
  basecoat?: number;
  basecoatQuantity?: string;
}

export interface RegistrationResubmitUpdateInvoice {
  imageId: number;
  invoiceType: 'TOPCOAT' | 'BASECOAT';
}

export interface RegistrationResubmitUpdatePayload extends Record<string, unknown> {
  customerName?: string;
  phoneNumber?: string;
  email?: string;
  city?: string;
  province?: string;
  siteAddress?: string;
  purchaseDate?: string;
  purchaseDealer?: string;
  purchaseDealerCity?: string;
  purchaseDealerAddress?: string;
  postalCode?: string;
  paintPairs?: RegistrationResubmitUpdatePaintPair[];
  paintPairInvoices?: RegistrationResubmitUpdateInvoice[];
}
