import { describe, expect, it } from 'vitest';

import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from '#/schemas/authSchemas';
import { approveClaimFinalSchema } from '#/schemas/claim.schema';
import { sendMessageSchema, complaintQueueSocketEventSchema } from '#/schemas/complaints.schema';
import { qualityApproveSchema, qualityRequestInfoSchema } from '#/schemas/quality.schema';

describe('schema unit validations', () => {
  it('validates login schema with trimmed email and password length', () => {
    const parsed = loginSchema.parse({ email: '  agent@dulux.pk  ', password: 'password123' });

    expect(parsed.email).toBe('agent@dulux.pk');
  });

  it('rejects reset password when confirmation does not match', () => {
    const result = resetPasswordSchema.safeParse({ password: 'password123', confirmPassword: 'password124' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
    }
  });

  it('rejects unknown required item when quality request payload is invalid', () => {
    const result = qualityRequestInfoSchema.safeParse({ requiredItems: ['OTHER'], notes: 'Need more detail' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.join('.') === 'requiredItems.0')).toBe(true);
    }
  });

  it('enforces minimum length on quality approval technical notes', () => {
    const result = qualityApproveSchema.safeParse({ technicalNotes: 'short' });

    expect(result.success).toBe(false);
  });

  it('validates complaint send message and strict queue socket event type', () => {
    expect(sendMessageSchema.safeParse({ message: '   ' }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ message: 'hello' }).success).toBe(true);

    expect(complaintQueueSocketEventSchema.safeParse({ event: 'complaint.created' }).success).toBe(true);
    expect(complaintQueueSocketEventSchema.safeParse({ event: 'complaint.updated' }).success).toBe(false);
  });

  it('accepts forgot-password valid email payload', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'agent@dulux.pk' }).success).toBe(true);
  });

  it('rejects non-PDF voucher file for claim final approval', () => {
    const pngVoucher = new File(['voucher'], 'voucher.png', { type: 'image/png' });
    const result = approveClaimFinalSchema.safeParse({ notes: 'Approved', voucher: pngVoucher });

    expect(result.success).toBe(false);
  });

  it('accepts PDF voucher file for claim final approval', () => {
    const pdfVoucher = new File(['voucher'], 'voucher.pdf', { type: 'application/pdf' });
    const result = approveClaimFinalSchema.safeParse({ notes: 'Approved', voucher: pdfVoucher });

    expect(result.success).toBe(true);
  });
});
