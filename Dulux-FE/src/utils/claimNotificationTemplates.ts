import type { ClaimDetail } from '#/types/claims.types';

const escapeHtml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const isMeaningfulValue = (value: string | undefined): value is string => {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim().toUpperCase();
  return normalizedValue.length > 0 && normalizedValue !== 'N/A' && normalizedValue !== 'UNKNOWN';
};

const pickDisplayValue = (
  primaryValue: string | undefined,
  fallbackValue: string | undefined,
  ultimateFallback: string
): string => {
  if (isMeaningfulValue(primaryValue)) {
    return primaryValue.trim();
  }
  if (isMeaningfulValue(fallbackValue)) {
    return fallbackValue.trim();
  }
  return ultimateFallback;
};

export const createClaimApprovedTemplate = (claim: ClaimDetail, notes: string): string => {
  const claimNumber = escapeHtml(claim.claimNumber);
  const registrationId = escapeHtml(
    pickDisplayValue(claim.registrationId, claim.linkedRegistration.registrationId, 'N/A')
  );
  const customerName = escapeHtml(
    pickDisplayValue(claim.customerName, claim.linkedRegistration.customerName, 'Valued Customer')
  );
  const finalNotes = escapeHtml(notes);

  return `
    <html>
      <body>
        <h1>Update On Your Warranty Claim</h1>
        <p>Dear ${customerName},</p>
        <p>
          Your warranty claim <strong>${claimNumber}</strong> for registration <strong>${registrationId}</strong> has been approved after technical and customer service review.
        </p>
        <p><strong>Message from our team:</strong> ${finalNotes}</p>
        <p>
          Our customer service team will share the approved voucher and next steps through the official notification channel.
        </p>
        <p>Thank you for choosing Dulux.</p>
        <p>Regards,<br />Dulux Customer Service</p>
      </body>
    </html>
  `.trim();
};

export const createClaimRejectedTemplate = (claim: ClaimDetail, notes: string): string => {
  const claimNumber = escapeHtml(claim.claimNumber);
  const registrationId = escapeHtml(
    pickDisplayValue(claim.registrationId, claim.linkedRegistration.registrationId, 'N/A')
  );
  const customerName = escapeHtml(
    pickDisplayValue(claim.customerName, claim.linkedRegistration.customerName, 'Valued Customer')
  );
  const finalNotes = escapeHtml(notes);

  return `
    <html>
      <body>
        <h1>Update On Your Warranty Claim</h1>
        <p>Dear ${customerName},</p>
        <p>
          Your warranty claim <strong>${claimNumber}</strong> for registration <strong>${registrationId}</strong> has been reviewed and closed as rejected.
        </p>
        <p><strong>Reason shared by our team:</strong> ${finalNotes}</p>
        <p>
          If you need clarification, please contact customer service and share your claim number for faster support.
        </p>
        <p>Regards,<br />Dulux Customer Service</p>
      </body>
    </html>
  `.trim();
};
