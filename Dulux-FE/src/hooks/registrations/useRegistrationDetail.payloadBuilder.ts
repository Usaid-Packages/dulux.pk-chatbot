import {
  APPROVAL_TEMPLATE_FALLBACK_NOTE,
  REJECTION_TEMPLATE_FALLBACK_NOTE,
  TOPCOAT_INVOICE_TYPE,
  TRIMMED_FIELD_MAPPINGS,
} from '#/constants';
import type {
  ApproveFormValues,
  RejectFormValues,
  ResubmissionFormValues,
  ResubmitUpdateFormValues,
} from '#/schemas/registrations';
import type {
  RegistrationDetail,
  RegistrationResubmitUpdatePayload,
  ResubmissionFieldName,
} from '#/types/registrations';
import { createRegistrationApprovedTemplate, createRegistrationRejectedTemplate } from '#/utils';

export interface ApproveRegistrationMutationPayload {
  id: string;
  notes: string;
  notificationTemplate: string;
}

export interface RejectRegistrationMutationPayload {
  id: string;
  notes: string;
  notificationTemplate: string;
}

export interface ResubmitRegistrationMutationPayload {
  id: string;
  fields: ResubmissionFieldName[];
  notes: string;
}

export interface UpdateResubmitRegistrationMutationPayload {
  id: string;
  payload: RegistrationResubmitUpdatePayload;
  invoiceFiles: File[];
}

const toIntegerOrNull = (value: string): number | null => {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number.parseInt(normalizedValue, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

export const buildApproveRegistrationMutationPayload = (
  registrationId: string,
  registration: RegistrationDetail,
  values: ApproveFormValues
): ApproveRegistrationMutationPayload => {
  const normalizedNotes = values.notes.trim();
  const templateNotes = normalizedNotes || APPROVAL_TEMPLATE_FALLBACK_NOTE;

  return {
    id: registrationId,
    notes: normalizedNotes,
    notificationTemplate: createRegistrationApprovedTemplate(registration, templateNotes),
  };
};

export const buildRejectRegistrationMutationPayload = (
  registrationId: string,
  registration: RegistrationDetail,
  values: RejectFormValues
): RejectRegistrationMutationPayload => {
  const normalizedNotes = values.notes.trim();
  const templateNotes = normalizedNotes || REJECTION_TEMPLATE_FALLBACK_NOTE;

  return {
    id: registrationId,
    notes: normalizedNotes,
    notificationTemplate: createRegistrationRejectedTemplate(registration, templateNotes),
  };
};

export const buildResubmitRegistrationMutationPayload = (
  registrationId: string,
  values: ResubmissionFormValues
): ResubmitRegistrationMutationPayload => ({
  id: registrationId,
  fields: values.fields,
  notes: values.notes.trim(),
});

export const buildResubmitUpdatePayload = (
  registration: RegistrationDetail,
  values: ResubmitUpdateFormValues
): RegistrationResubmitUpdatePayload => {
  const payload: RegistrationResubmitUpdatePayload = {};
  const requestedFieldNames = new Set<ResubmissionFieldName>(
    registration.rejectionFields.map(field => field.fieldName)
  );

  for (const mapping of TRIMMED_FIELD_MAPPINGS) {
    if (!requestedFieldNames.has(mapping.requestedFieldName)) {
      continue;
    }

    payload[mapping.payloadKey] = (values[mapping.valueKey] ?? '').trim();
  }

  if (requestedFieldNames.has('paint_pairs')) {
    payload.paintPairs = values.paintPairs.map(paintPair => {
      const topcoat = toIntegerOrNull(paintPair.topcoatId);
      if (!topcoat) {
        throw new Error('Topcoat product is required for every paint pair.');
      }

      const basecoat = toIntegerOrNull(paintPair.basecoatId);

      return {
        topcoat,
        topcoatQuantity: paintPair.topcoatQuantity.trim(),
        ...(basecoat ? { basecoat } : {}),
        ...(paintPair.basecoatQuantity.trim() ? { basecoatQuantity: paintPair.basecoatQuantity.trim() } : {}),
      };
    });
  }

  if (requestedFieldNames.has('paint_pair_invoices')) {
    payload.paintPairInvoices = registration.paintPairInvoices.map(invoice => ({
      imageId: invoice.image.id,
      invoiceType: invoice.invoiceType || TOPCOAT_INVOICE_TYPE,
    }));
  }

  return payload;
};
