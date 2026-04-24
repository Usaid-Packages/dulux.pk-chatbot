import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class AppShellPage {
  constructor(private readonly page: Page) {}

  async expectPath(pathSuffix: string): Promise<void> {
    const escapedPath = pathSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(this.page).toHaveURL(new RegExp(`${escapedPath}(?:\\?.*)?$`));
  }

  async expectHeadingVisible(title: string): Promise<void> {
    await expect(this.page.getByRole('heading', { name: title })).toBeVisible();
  }
}
