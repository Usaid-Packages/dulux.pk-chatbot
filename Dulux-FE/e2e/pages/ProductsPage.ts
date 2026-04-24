import type { Page } from '@playwright/test';

export class ProductsPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('products');
  }

  async openSurfaceTypesTab(): Promise<void> {
    await this.page.getByRole('button', { name: 'Surface Types' }).click();
  }
}
