import { REQUESTED_FIELD_ORDER } from '#/constants/registrations/resubmitUpdate.constants';
import type { ResubmitUpdateFormValues } from '#/schemas/registrations';
import type { ManualRegistrationProductOption } from '#/types/manualRegistration';
import type { RegistrationDetail, RegistrationRejectionField, RequestedCorrectionNote } from '#/types/registrations';
import { formatPkDateTime } from '#/utils/date';
import { normalizePkPhoneWithPrefix, sanitizeLettersOnly } from '../formSanitizers';

export const getRequestedFieldNames = (
  rejectionFields: RegistrationRejectionField[]
): RegistrationRejectionField['fieldName'][] => {
  const names = new Set(rejectionFields.map(field => field.fieldName));
  return REQUESTED_FIELD_ORDER.filter(fieldName => names.has(fieldName));
};

const formatNoteTimestamp = (value: string): string => {
  if (!value.trim()) {
    return '';
  }

  return formatPkDateTime(value, '');
};

export const getRequestedCorrectionNotes = (
  rejectionFields: RegistrationRejectionField[],
  requestedFieldNames: RegistrationRejectionField['fieldName'][]
): RequestedCorrectionNote[] => {
  const requestedFieldNameSet = new Set<RegistrationRejectionField['fieldName']>(requestedFieldNames);
  const uniqueNotes = new Map<string, RequestedCorrectionNote>();

  rejectionFields.forEach(field => {
    if (!requestedFieldNameSet.has(field.fieldName)) {
      return;
    }

    const normalizedNote = field.note?.trim() ?? '';
    if (!normalizedNote) {
      return;
    }

    const timestamp = formatNoteTimestamp(field.created);
    const noteKey = `${normalizedNote}::${timestamp}`;
    if (uniqueNotes.has(noteKey)) {
      return;
    }

    uniqueNotes.set(noteKey, {
      key: noteKey,
      note: normalizedNote,
      timestamp,
    });
  });

  return Array.from(uniqueNotes.values());
};

export const getProductOptionLabel = (product: ManualRegistrationProductOption): string => {
  if (typeof product.warrantyYears === 'number' && product.warrantyYears > 0) {
    return `${product.label} (${product.warrantyYears} year warranty)`;
  }

  return product.label;
};

export const mergeUniqueProductOptions = (
  primaryOptions: ManualRegistrationProductOption[],
  fallbackOptions: ManualRegistrationProductOption[]
): ManualRegistrationProductOption[] => {
  const optionMap = new Map<string, ManualRegistrationProductOption>();

  fallbackOptions.forEach(option => {
    optionMap.set(option.id, option);
  });

  primaryOptions.forEach(option => {
    optionMap.set(option.id, option);
  });

  return Array.from(optionMap.values());
};

export const getDefaultPaintPairs = (registration: RegistrationDetail): ResubmitUpdateFormValues['paintPairs'] => {
  if (registration.paintPairs.length > 0) {
    return registration.paintPairs.map(pair => ({
      topcoatId: String(pair.topcoat.id),
      topcoatQuantity: pair.topcoatQuantity,
      basecoatId: pair.basecoat?.id ? String(pair.basecoat.id) : '',
      basecoatQuantity: pair.basecoatQuantity ?? '',
    }));
  }

  return [
    {
      topcoatId: '',
      topcoatQuantity: '',
      basecoatId: '',
      basecoatQuantity: '',
    },
  ];
};

export const getRegistrationTopcoatFallbackOptions = (
  registration: RegistrationDetail
): ManualRegistrationProductOption[] => {
  return registration.paintPairs.map(pair => ({
    id: String(pair.topcoat.id),
    label: pair.topcoat.name,
  }));
};

export const getRegistrationBasecoatFallbackByTopcoatId = (
  registration: RegistrationDetail
): ReadonlyMap<string, ManualRegistrationProductOption[]> => {
  const fallbackMap = new Map<string, ManualRegistrationProductOption[]>();

  registration.paintPairs.forEach(pair => {
    if (!pair.basecoat) {
      return;
    }

    const topcoatId = String(pair.topcoat.id);
    const basecoatOption: ManualRegistrationProductOption = {
      id: String(pair.basecoat.id),
      label: pair.basecoat.name,
    };
    const existingOptions = fallbackMap.get(topcoatId) ?? [];
    fallbackMap.set(topcoatId, mergeUniqueProductOptions([basecoatOption], existingOptions));
  });

  return fallbackMap;
};

export const removeDigits = sanitizeLettersOnly;
export const toPkPhoneWithPrefix = normalizePkPhoneWithPrefix;
