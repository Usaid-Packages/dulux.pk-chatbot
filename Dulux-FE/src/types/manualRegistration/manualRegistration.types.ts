export const manualRegistrationStepIds = [1, 2, 3, 4, 5] as const;

export type ManualRegistrationStepId = (typeof manualRegistrationStepIds)[number];

export interface ManualRegistrationStep {
  id: ManualRegistrationStepId;
  label: string;
}

export interface ManualRegistrationProductOption {
  id: string;
  label: string;
  warrantyYears?: number;
  productType?: string;
  isActive?: boolean;
  linkedBasecoats?: ManualRegistrationProductOption[];
}

export const manualRegistrationSelectionTypes = ['SPECIALIST', 'TOPCOAT'] as const;
export type ManualRegistrationSelectionType = (typeof manualRegistrationSelectionTypes)[number];

export interface ManualRegistrationPaintPairInput {
  selectionType: '' | ManualRegistrationSelectionType;
  specialistProductId: string;
  specialistQuantity: string;
  topcoatProductId: string;
  topcoatQuantity: string;
  basecoatProductId: string;
  basecoatQuantity: string;
}

export interface ManualRegistrationFormValues {
  customerName: string;
  phoneNumber: string;
  email: string;
  city: string;
  siteAddress: string;
  postalCode: string;
  purchaseDate: string;
  purchaseDealer: string;
  purchaseDealerCity: string;
  purchaseDealerAddress: string;
  notes: string;
  selectionType: '' | ManualRegistrationSelectionType;
  specialistProductId: string;
  specialistQuantity: string;
  topcoatProductId: string;
  topcoatQuantity: string;
  basecoatProductId: string;
  basecoatQuantity: string;
  invoices: File[];
  additionalPaintPairs: ManualRegistrationPaintPairInput[];
}

export interface ManualRegistrationSubmissionResult {
  id: number;
  registrationCode: string;
}

export interface ManualRegistrationSubmissionState {
  status: 'idle' | 'success' | 'error';
  errorMessage: string | null;
}

export interface ManualRegistrationApiResponse {
  id?: number;
  registrationCode?: string;
  registrationNumber?: string;
  registration?: {
    id?: number;
    registrationCode?: string;
  };
}
