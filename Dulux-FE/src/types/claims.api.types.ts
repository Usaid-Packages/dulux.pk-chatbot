export interface ApiPaginationResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiClaimListItem {
  id: number;
  customer_name?: string;
  registration_number?: string;
  registration_code?: string;
  topcoat_name?: string;
  issue_type: string;
  affected_area_sqft: string;
  claim_date: string;
  state: string;
}

export interface ApiClaimImageFile {
  id: number;
  image: string;
  created: string;
}

export interface ApiClaimImage {
  id: number;
  photo_type: string;
  image: ApiClaimImageFile;
  created: string;
}

export interface ApiClaimResubmissionImageFile {
  id: number;
  image: string;
  created: string;
}

export interface ApiClaimResubmissionEntry {
  id: number;
  required_item?: string;
  requiredItem?: string;
  response_text?: string;
  responseText?: string;
  image?: ApiClaimResubmissionImageFile | null;
  created: string;
}

export interface ApiClaimLatestResubmission {
  id: number;
  source: string;
  notes: string;
  entries: ApiClaimResubmissionEntry[];
  created: string;
}

export interface ApiRegistrationSummary {
  id: number;
  registration_code: string;
  customer_name: string;
  phone_number: string;
  channel: string;
  state: string;
  purchase_date: string;
  created: string;
}

export interface ApiPaintPairSummary {
  id: number;
  topcoat: number;
  topcoat_name: string;
  topcoat_quantity: string;
  basecoat: number | null;
  basecoat_name: string | null;
  basecoat_quantity: string | null;
  created: string;
}

export interface ApiClaimDetail {
  id: number;
  registration: ApiRegistrationSummary;
  paint_pair: ApiPaintPairSummary | null;
  issue_type: string;
  affected_area_sqft: string;
  claim_date: string;
  state: string;
  notes: string;
  approved_by: string | null;
  approved_at: string | null;
  images: ApiClaimImage[];
  latest_resubmission?: ApiClaimLatestResubmission | null;
  latestResubmission?: ApiClaimLatestResubmission | null;
  created: string;
  modified: string;
}

export type ClaimsListApiResponse = ApiPaginationResponse<ApiClaimListItem>;

export interface ClaimsListApiQuery {
  state?: string;
  issue_type?: string;
  search?: string;
  page: number;
  page_size: number;
}

export interface CreateClaimRequestPayload {
  registration: number;
  paint_pair: number;
  issue_type: string;
  affected_area_sqft: string;
  notes: string;
  images: Array<{
    image_id: number;
    photo_type: string;
  }>;
}

export interface ApproveClaimRequestPayload {
  action: 'APPROVE';
  notification_template: string;
  notes?: string;
  voucher: File;
}

export interface MarkClaimInReviewRequestPayload {
  action: 'IN_REVIEW';
}

export interface SendToQualityRequestPayload {
  action: 'QA_REVIEW';
  notes: string;
}

export interface RejectClaimRequestPayload {
  action: 'REJECT';
  notes: string;
  notification_template: string;
}

export interface RequestMoreInfoClaimRequestPayload {
  action: 'RESUBMIT';
  notes: string;
}

export interface ApiClaimCsrResubmissionRequestedItem {
  required_item?: string;
  requiredItem?: string;
  label?: string;
  input_type?: string;
  inputType?: string;
  is_multiple?: boolean;
  isMultiple?: boolean;
}

export interface ApiClaimCsrResubmissionRequestResponse {
  claim_id?: number;
  claimId?: number;
  claim_state?: string;
  claimState?: string;
  quality_review_id?: number;
  qualityReviewId?: number;
  quality_notes?: string;
  qualityNotes?: string;
  other_text?: string;
  otherText?: string;
  requested_items?: ApiClaimCsrResubmissionRequestedItem[];
  requestedItems?: ApiClaimCsrResubmissionRequestedItem[];
  created?: string;
}

export interface ClaimCsrResubmissionEntryRequestPayload {
  required_item: string;
  response_text?: string;
  image_id?: number;
}

export interface ClaimCsrResubmissionSubmitRequestPayload {
  notes?: string;
  entries: ClaimCsrResubmissionEntryRequestPayload[];
}
