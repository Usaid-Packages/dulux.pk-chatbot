import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ManualRegistrationWizardPage {
  constructor(private readonly page: Page) {}

  async gotoRoot(): Promise<void> {
    await this.page.goto('manual-registration');
  }

  async gotoStep(stepId: number): Promise<void> {
    await this.page.goto(`manual-registration/step/${stepId}`);
  }

  async expectStep(stepId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/manual-registration/step/${stepId}(?:\\?.*)?$`));
  }
}
