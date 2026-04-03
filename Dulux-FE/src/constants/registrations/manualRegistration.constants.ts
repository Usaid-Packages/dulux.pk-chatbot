import type {
  ManualRegistrationFormValues,
  ManualRegistrationProductOption,
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

export const MANUAL_REGISTRATION_TOPCOAT_PRODUCTS: ManualRegistrationProductOption[] = [
  { id: 'dulux_weathershield', label: 'Dulux WeatherShield' },
  { id: 'dulux_easyclean', label: 'Dulux EasyClean' },
  { id: 'dulux_ambiance', label: 'Dulux Ambiance' },
  { id: 'dulux_pentalite', label: 'Dulux Pentalite Ultra' },
];

export const MANUAL_REGISTRATION_BASECOAT_PRODUCTS: ManualRegistrationProductOption[] = [
  { id: 'dulux_primer_base', label: 'Dulux Primer Base' },
  { id: 'dulux_undercoat', label: 'Dulux Undercoat' },
  { id: 'dulux_sealer', label: 'Dulux Sealer Pro' },
];

export const MANUAL_REGISTRATION_DEFAULT_VALUES: ManualRegistrationFormValues = {
  customerName: '',
  phoneNumber: '',
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
  topcoatProductName: '',
  topcoatQuantity: '',
  basecoatProductName: '',
  basecoatQuantity: '',
  topcoatInvoice: null,
  basecoatInvoice: null,
};

export const MANUAL_REGISTRATION_STEP_FIELDS: Record<
  ManualRegistrationStepId,
  readonly (keyof ManualRegistrationFormValues)[]
> = {
  1: ['customerName', 'phoneNumber', 'email', 'city', 'province', 'siteAddress', 'postalCode'],
  2: ['purchaseDate', 'purchaseDealer', 'purchaseDealerCity', 'purchaseDealerAddress', 'notes'],
  3: ['topcoatProductName', 'topcoatQuantity', 'basecoatProductName', 'basecoatQuantity'],
  4: ['topcoatInvoice', 'basecoatInvoice', 'basecoatProductName'],
  5: [],
};
