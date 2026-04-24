import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('dashboard');
  }

  getModulesSection(): Locator {
    return this.page.getByRole('region', { name: 'Dashboard modules' });
  }

  getModuleLink(label: string): Locator {
    return this.page.getByRole('link', { name: `Open ${label}` });
  }

  async expectModuleCardsCount(expectedCount: number): Promise<void> {
    await expect(this.getModulesSection().getByRole('link')).toHaveCount(expectedCount);
  }

  async openModule(label: string): Promise<void> {
    await this.getModuleLink(label).click();
  }

  async expectAnalyticsVisible(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Weekly Submissions Trend' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Queue Workload Split' })).toBeVisible();
  }
}
