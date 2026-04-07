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
}

export interface RequestMoreInfoClaimRequestPayload {
  action: 'RESUBMIT';
  notes: string;
}
