import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class RegistrationsPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('registrations');
  }

  getSearchInput(): Locator {
    return this.page.getByRole('searchbox', { name: 'Search registrations' });
  }

  getTab(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  async openFirstDetail(): Promise<void> {
    await this.page.getByRole('button', { name: 'View Detail' }).first().click();
  }

  async expectStatsVisible(): Promise<void> {
    await expect(this.page.locator('article').filter({ hasText: 'Total Registrations' }).first()).toBeVisible();
    await expect(this.page.locator('article').filter({ hasText: 'Pending' }).first()).toBeVisible();
    await expect(this.page.locator('article').filter({ hasText: 'Approved' }).first()).toBeVisible();
    await expect(this.page.locator('article').filter({ hasText: 'Rejected' }).first()).toBeVisible();
  }
}
