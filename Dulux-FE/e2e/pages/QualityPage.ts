import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class QualityPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('quality');
  }

  async openFirstDetail(): Promise<void> {
    await this.page.getByRole('button', { name: 'View Detail' }).first().click();
  }

  async expectQueueStatsVisible(): Promise<void> {
    const statsSection = this.page.locator('section.wf-stat-grid-4');
    await expect(statsSection.getByText('Total In Queue', { exact: true })).toBeVisible();
    await expect(statsSection.getByText('QA Review', { exact: true })).toBeVisible();
  }
}
