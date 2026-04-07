import type {
  ManualRegistrationFormValues,
  ManualRegistrationStep,
  ManualRegistrationStepId,
} from '#/types/manualRegistration';

export const MANUAL_REGISTRATION_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const MANUAL_REGISTRATION_ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;

export const MANUAL_REGISTRATION_STEPS: ManualRegistrationStep[] = [
  { id: 1, label: 'Personal Info' },
  { id: 2, label: 'Purchase & Dealer' },
  { id: 3, label: 'Products' },
  { id: 4, label: 'Invoices' },
  { id: 5, label: 'Review' },
];

export const MANUAL_REGISTRATION_DEFAULT_VALUES: ManualRegistrationFormValues = {
  customerName: '',
  phoneNumber: '92',
  email: '',
  city: '',
  province: '',
  siteAddress: '',
  postalCode: '',
  purchaseDate: '',
  purchaseDealer: '',
  purchaseDealerCity: '',
  purchaseDealerAddress: '',
  notes: '',
  topcoatProductId: '',
  topcoatQuantity: '',
  basecoatProductId: '',
  basecoatQuantity: '',
  topcoatInvoice: null,
  basecoatInvoice: null,
  additionalPaintPairs: [],
};

export const MANUAL_REGISTRATION_STEP_FIELDS: Record<
  ManualRegistrationStepId,
  readonly (keyof ManualRegistrationFormValues)[]
> = {
  1: ['customerName', 'phoneNumber', 'email', 'city', 'province', 'siteAddress', 'postalCode'],
  2: ['purchaseDate', 'purchaseDealer', 'purchaseDealerCity', 'purchaseDealerAddress', 'notes'],
  3: ['topcoatProductId', 'topcoatQuantity', 'basecoatProductId', 'basecoatQuantity', 'additionalPaintPairs'],
  4: ['topcoatInvoice', 'basecoatInvoice', 'basecoatProductId', 'additionalPaintPairs'],
  5: [],
};
