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
  created: string;
  modified: string;
}

export interface RegistrationsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RegistrationListItem[];
}

export interface RegistrationsQueryParams extends Record<string, unknown> {
  search?: string;
  state?: RegistrationStatus;
  channel?: RegistrationChannel;
  page?: number;
  ordering?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface ResubmissionFieldPayload {
  fieldName: string;
  note?: string;
}

export interface RegistrationActionPayload extends Record<string, unknown> {
  action: 'APPROVE' | 'REJECT' | 'RESUBMIT';
  notes?: string;
  rejectionFields?: ResubmissionFieldPayload[];
}
