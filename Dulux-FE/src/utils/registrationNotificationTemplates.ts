import type { RegistrationDetail } from '#/types/registrations';

const escapeHtml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

export const createRegistrationApprovedTemplate = (registration: RegistrationDetail, notes: string): string => {
  const registrationCode = escapeHtml(registration.registrationCode);
  const customerName = escapeHtml(registration.customerName);
  const approvalNotes = escapeHtml(notes);

  return `
    <html>
      <body>
        <h1>Your Warranty Registration Is Approved</h1>
        <p>Dear ${customerName},</p>
        <p>
          Thank you for completing your Dulux Assurance Warranty registration.
          We are pleased to confirm that registration <strong>${registrationCode}</strong> has been approved.
        </p>
        <p><strong>Message from our Customer Service team:</strong> ${approvalNotes}</p>
        <p><strong>What happens next:</strong></p>
        <ul>
          <li>Your registration is now marked as approved in our system.</li>
          <li>Your warranty certificate will be shared through the official notification flow.</li>
          <li>Please keep your registration code <strong>${registrationCode}</strong> for future reference.</li>
        </ul>
        <p>
          If you need any further assistance, please contact our Customer Service team and share your registration code
          for faster support.
        </p>
        <p>Thank you for choosing Dulux.</p>
        <p>Regards,<br />Dulux Customer Service</p>
      </body>
    </html>
  `.trim();
};

export const createRegistrationRejectedTemplate = (registration: RegistrationDetail, notes: string): string => {
  const registrationCode = escapeHtml(registration.registrationCode);
  const customerName = escapeHtml(registration.customerName);
  const rejectionNotes = escapeHtml(notes);

  return `
    <html>
      <body>
        <h1>Update on Your Warranty Registration</h1>
        <p>Dear ${customerName},</p>
        <p>
          Thank you for submitting your Dulux Assurance Warranty registration.
          After a careful review, we are unable to approve registration <strong>${registrationCode}</strong> at this time.
        </p>
        <p><strong>Reason provided by our Customer Service team:</strong> ${rejectionNotes}</p>
        <p>
          You may submit a new registration once the highlighted issues are corrected and all required information is complete.
        </p>
        <p><strong>Recommended next steps:</strong></p>
        <ul>
          <li>Review your registration details for accuracy.</li>
          <li>Update any missing or incorrect information.</li>
          <li>Re-upload clear supporting invoices/documents if needed.</li>
        </ul>
        <p>
          If you need assistance, please contact our Customer Service team and share your registration code
          <strong> ${registrationCode}</strong> for quick support.
        </p>
        <p>Thank you for your understanding.</p>
        <p>Regards,<br />Dulux Customer Service</p>
      </body>
    </html>
  `.trim();
};
