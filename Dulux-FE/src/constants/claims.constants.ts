import type { ClaimIssueTypeOption } from '#/types/claims.types';

export const CLAIM_ACTIONS = {
  IN_REVIEW: 'IN_REVIEW',
  QA_REVIEW: 'QA_REVIEW',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  RESUBMIT: 'RESUBMIT',
} as const;

export const CLAIM_NO_BASECOAT_OPTION_VALUE = 'NONE';
export const CLAIM_VOUCHER_ACCEPT = '.pdf';
export const CLAIM_VOUCHER_ALLOWED_MIME_TYPES = ['application/pdf'] as const;
export const CLAIM_VOUCHER_FILE_REQUIRED_MESSAGE = 'Voucher PDF file is required.';
export const CLAIM_VOUCHER_FILE_TYPE_MESSAGE = 'Only PDF vouchers are allowed.';

export const CLAIM_ISSUE_TYPE_OPTIONS: ReadonlyArray<ClaimIssueTypeOption> = [
  { label: 'Peeling / Cracking', value: 'PEELING_CRACKING' },
  { label: 'Color Fading', value: 'COLOR_FADING' },
  { label: 'Algae / Fungus', value: 'ALGAE_FUNGUS' },
  { label: 'Water Ingress', value: 'WATER_INGRESS' },
  { label: 'Coverage Variance', value: 'COVERAGE_VARIANCE' },
  { label: 'Non-uniform Finish', value: 'NON_UNIFORM_FINISH' },
  { label: 'Others', value: 'OTHERS' },
];
