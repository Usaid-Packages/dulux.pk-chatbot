import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ClaimDetailPage {
  constructor(private readonly page: Page) {}

  async goto(id: string): Promise<void> {
    await this.page.goto(`claims/${id}`);
  }

  async openForwardToQualityModal(): Promise<void> {
    await this.page.getByRole('button', { name: 'Send To Quality' }).click();
    await expect(this.page.getByRole('dialog', { name: 'Forward Claim To Quality' })).toBeVisible();
  }

  async submitForwardToQuality(notes: string): Promise<void> {
    await this.page.getByLabel('CS Notes').fill(notes);
    await this.page.getByRole('button', { name: 'Forward' }).click();
  }

  async openCsrResubmissionModal(): Promise<void> {
    await this.page.getByRole('button', { name: 'CSR Resubmission' }).click();
    await expect(this.page.getByRole('dialog', { name: 'CSR Resubmission' })).toBeVisible();
  }

  async submitCsrResubmission(notes: string): Promise<void> {
    await this.page.getByRole('textbox', { name: /Site condition details/i }).fill('Requested site context.');
    await this.page.getByLabel('CSR Notes (Optional)').fill(notes);
    await this.page.getByRole('button', { name: 'Submit To QA' }).click();
  }
}
