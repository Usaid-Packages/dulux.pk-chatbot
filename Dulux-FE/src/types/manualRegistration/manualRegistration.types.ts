export const manualRegistrationStepIds = [1, 2, 3, 4, 5] as const;

export type ManualRegistrationStepId = (typeof manualRegistrationStepIds)[number];

export interface ManualRegistrationStep {
  id: ManualRegistrationStepId;
  label: string;
}

export interface ManualRegistrationProductOption {
  id: string;
  label: string;
}

export interface ManualRegistrationFormValues {
  customerName: string;
  phoneNumber: string;
  email: string;
  city: string;
  province: string;
  siteAddress: string;
  postalCode: string;
  purchaseDate: string;
  purchaseDealer: string;
  purchaseDealerCity: string;
  purchaseDealerAddress: string;
  notes: string;
  topcoatProductId: string;
  topcoatQuantity: string;
  basecoatProductId: string;
  basecoatQuantity: string;
  topcoatInvoice: File | null;
  basecoatInvoice: File | null;
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
