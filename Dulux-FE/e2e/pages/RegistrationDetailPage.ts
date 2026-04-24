import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class RegistrationDetailPage {
  constructor(private readonly page: Page) {}

  async goto(id: string): Promise<void> {
    await this.page.goto(`registrations/${id}`);
  }

  async openApproveModal(): Promise<void> {
    await this.page.getByRole('button', { name: 'Approve' }).click();
    await expect(this.page.getByRole('dialog', { name: 'Approve Registration' })).toBeVisible();
  }

  async submitApprove(): Promise<void> {
    await this.page.getByRole('button', { name: 'Approve Registration' }).click();
  }

  async openResubmissionModal(): Promise<void> {
    await this.page.getByRole('button', { name: 'Request Resubmission' }).click();
    await expect(this.page.getByRole('dialog', { name: 'Request Resubmission' })).toBeVisible();
  }

  async submitResubmissionRequest(): Promise<void> {
    await this.page.getByLabel('Full Name').check();
    await this.page.getByRole('button', { name: 'Send Request' }).click();
  }

  async openRejectModal(): Promise<void> {
    await this.page.getByRole('button', { name: 'Reject Registration' }).click();
    await expect(this.page.getByRole('dialog', { name: 'Reject Registration' })).toBeVisible();
  }

  async submitReject(notes: string): Promise<void> {
    await this.page.getByLabel('Notes (Optional)').fill(notes);
    await this.page.getByRole('button', { name: 'Reject Registration' }).click();
  }
}
