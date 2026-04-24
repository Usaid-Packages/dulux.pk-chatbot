import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ClaimsPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('claims');
  }

  getSearchInput(): Locator {
    return this.page.getByRole('searchbox', { name: /Search by registration or phone number/i });
  }

  async openFirstDetail(): Promise<void> {
    await this.page.getByRole('link', { name: 'View Detail' }).first().click();
  }

  async expectStatsVisible(): Promise<void> {
    const statsSection = this.page.locator('section.wf-stat-grid-4');
    await expect(statsSection.getByText('Total Claims', { exact: true })).toBeVisible();
    await expect(statsSection.getByText('Pending', { exact: true })).toBeVisible();
    await expect(statsSection.getByText('Approved', { exact: true })).toBeVisible();
    await expect(statsSection.getByText('Rejected', { exact: true })).toBeVisible();
  }
}
