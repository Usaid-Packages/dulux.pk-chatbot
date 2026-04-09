import type { CreateClaimRequestPayload } from '#/types/claims.api.types';
import type { CreateClaimPayload, RequestMoreInfoPayload, SendToQualityPayload } from '#/types/claims.types';

interface ClaimPhotoImageIds {
  longShotImageId: number;
  closeShotImageId: number;
  alternateAngleImageId: number;
}

export const toCreateClaimPayload = (
  payload: CreateClaimPayload,
  imageIds: ClaimPhotoImageIds
): CreateClaimRequestPayload => ({
  registration: payload.registration,
  paint_pair: payload.paintPair,
  issue_type: payload.issueType,
  affected_area_sqft: payload.affectedAreaSqft,
  notes: payload.notes,
  images: [
    {
      image_id: imageIds.longShotImageId,
      photo_type: 'LONG_SHOT',
    },
    {
      image_id: imageIds.closeShotImageId,
      photo_type: 'CLOSE_SHOT',
    },
    {
      image_id: imageIds.alternateAngleImageId,
      photo_type: 'ALTERNATE_ANGLE',
    },
  ],
});

export const toSendToQualityNotes = (payload: SendToQualityPayload): string => payload.notes;

export const toRequestMoreInfoNotes = (payload: RequestMoreInfoPayload): string => {
  const formattedItems = payload.items.map(item => `- ${item}`).join('\n');
  const noteLine = payload.note ? `Note: ${payload.note}` : '';

  return ['Requested information:', formattedItems, noteLine].filter(Boolean).join('\n');
};
