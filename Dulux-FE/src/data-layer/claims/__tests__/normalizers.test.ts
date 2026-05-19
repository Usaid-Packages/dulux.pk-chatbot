import { describe, expect, it } from 'vitest';

import type { ApiClaimDetail } from '#/types/claims.api.types';
import { normalizeClaimDetail } from '../normalizers';

const buildClaimDetail = (state: ApiClaimDetail['state'], notes: string): ApiClaimDetail => ({
  id: 301,
  registration: {
    id: 1301,
    registration_code: 'REG-301',
    customer_name: 'Areeba Khan',
    phone_number: '03001234567',
    channel: 'WEBFORM',
    state: 'SUBMITTED',
    purchase_date: '2026-04-01',
    created: '2026-04-01T10:00:00Z',
  },
  paint_pair: {
    id: 1,
    topcoat: 11,
    topcoat_name: 'Dulux Protect Plus',
    topcoat_quantity: '5',
    basecoat: null,
    basecoat_name: null,
    basecoat_quantity: null,
    created: '2026-04-01T10:00:00Z',
  },
  issue_type: 'PEELING_CRACKING',
  affected_area_sqft: '120',
  claim_date: '2026-04-02T10:00:00Z',
  state,
  notes,
  approved_by: 'QA Agent',
  approved_at: '2026-04-03T10:00:00Z',
  images: [],
  created: '2026-04-02T10:00:00Z',
  modified: '2026-04-03T10:00:00Z',
});

describe('claim detail note ownership normalization', () => {
  it('maps QA-state notes to qualityNotes and not csNotes', () => {
    const normalized = normalizeClaimDetail(buildClaimDetail('QA_APPROVED', 'QA approved after lab check.'));

    expect(normalized.qualityNotes).toBe('QA approved after lab check.');
    expect(normalized.csNotes).toBeUndefined();
  });

  it('maps CS-state notes to csNotes and not qualityNotes', () => {
    const normalized = normalizeClaimDetail(buildClaimDetail('IN_REVIEW', 'CS requested docs.'));

    expect(normalized.csNotes).toBe('CS requested docs.');
    expect(normalized.qualityNotes).toBeUndefined();
  });

  it('maps latest resubmission entries into claim detail', () => {
    const normalized = normalizeClaimDetail({
      ...buildClaimDetail('QA_REVIEW', 'Awaiting QA review'),
      latest_resubmission: {
        id: 24,
        source: 'COMPLAINT',
        notes: '',
        created: '2026-05-19T09:39:25.457628Z',
        entries: [
          {
            id: 51,
            required_item: 'CLOSE_UP_DAMAGE_PHOTOS',
            response_text: '',
            image: {
              id: 1620,
              image: '/django-media/images/2026/05/1131w-wGjvK8exIEY.webp',
              created: '2026-05-19T09:39:24.872184Z',
            },
            created: '2026-05-19T09:39:25.459645Z',
          },
        ],
      },
    });

    expect(normalized.latestResubmission).toBeDefined();
    expect(normalized.latestResubmission).toMatchObject({
      id: '24',
      source: 'COMPLAINT',
      createdAt: '2026-05-19T09:39:25.457628Z',
      entries: [
        {
          id: '51',
          requiredItem: 'CLOSE_UP_DAMAGE_PHOTOS',
          responseText: '',
          createdAt: '2026-05-19T09:39:25.459645Z',
        },
      ],
    });
    expect(normalized.latestResubmission?.entries[0]?.imageUrl).toContain(
      '/django-media/images/2026/05/1131w-wGjvK8exIEY.webp'
    );
  });
});
