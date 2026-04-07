import type { CreateClaimRequestPayload } from '#/types/claims.api.types';
import type {
  CreateClaimPayload,
  RejectClaimPayload,
  RequestMoreInfoPayload,
  SendToQualityPayload,
} from '#/types/claims.types';

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

export const toRejectNotes = (payload: RejectClaimPayload): string => {
  if (payload.notes) {
    return `${payload.reason}\n${payload.notes}`;
  }
  return payload.reason;
};

export const toRequestMoreInfoNotes = (payload: RequestMoreInfoPayload): string => {
  const formattedItems = payload.items.map(item => `- ${item}`).join('\n');
  const priorityLine = `Priority: ${payload.priority}`;
  const noteLine = payload.note ? `Note: ${payload.note}` : '';

  return [priorityLine, 'Requested information:', formattedItems, noteLine].filter(Boolean).join('\n');
};
