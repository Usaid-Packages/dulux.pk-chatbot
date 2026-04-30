import { authStatePaths } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/data.fixture';
import { ProductsPage } from '../../pages/ProductsPage';

const E2E_PRODUCT_IMAGE_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+Qh4AAAAASUVORK5CYII=',
  'base64'
);

test.describe('@critical products phase2', () => {
  test.use({ storageState: authStatePaths.cs });

  test('PROD-LIST-001 products and surface types tabs render with filters', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.goto();

    await expect(page.getByRole('button', { name: 'Products' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search products' })).toBeVisible();

    await productsPage.openSurfaceTypesTab();
    await expect(page.getByRole('searchbox', { name: 'Search surface types' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Surface Type' })).toBeVisible();
  });

  test('PROD-CRUD-001 create and edit product flows validate and submit', async ({ page }) => {
    let createPayload: Record<string, unknown> | null = null;

    await page.route(/.*\/api\/v1\/products\/?(?:\?.*)?$/, async route => {
      const request = route.request();
      const requestUrl = request.url();

      if (request.method() === 'POST' && !requestUrl.includes('/surface-types') && !requestUrl.includes('/warranty-options')) {
        createPayload = request.postDataJSON() as Record<string, unknown>;
      }

      await route.fallback();
    });

    await page.goto('products/new');
    await expect(page.getByRole('heading', { name: 'Add New Product' })).toBeVisible();

    await page.getByRole('button', { name: 'Create Product' }).click();
    await expect(page.getByText('Product name is required.')).toBeVisible();
    await expect(page.getByText('Coverage details are required.')).toBeVisible();
    await expect(page.getByText('Key features are required.')).toBeVisible();

    await page.getByLabel('Product Name *').fill('Dulux E2E Product');
    await page.getByLabel(/Warranty \(Years\)/i).fill('7');
    await page.getByLabel('Product URL *').fill('https://example.com/e2e-product');
    await page.getByLabel('Coverage Details *').fill('110 sq ft per liter');
    await page.getByLabel('Key Features *').fill('High durability and UV resistance.');
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'e2e-product.png',
      mimeType: 'image/png',
      buffer: E2E_PRODUCT_IMAGE_BUFFER,
    });
    await page.getByRole('button', { name: /Interior Surfaces/i }).click();
    await page.getByRole('button', { name: 'Wood' }).click();
    await page.getByRole('button', { name: 'Create Product' }).click();
    await expect.poll(() => createPayload?.name).toBe('Dulux E2E Product');
    await expect(page).toHaveURL(/\/products(?:\?.*)?$/);

    await page.goto('products/1/edit');
    await expect(page.getByRole('heading', { name: 'Edit Product' })).toBeVisible();
    await page.getByLabel('Product Name *').fill('Dulux Protect Plus Updated');
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'e2e-product-edit.png',
      mimeType: 'image/png',
      buffer: E2E_PRODUCT_IMAGE_BUFFER,
    });
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page).toHaveURL(/\/products(?:\?.*)?$/);
    await expect(page.getByRole('table')).toContainText('Dulux Protect Plus Updated');
  });

  test('PROD-SURFACE-001 create/edit/delete surface type from tab', async ({ page }) => {
    await page.goto('products?tab=surface-types');
    await expect(page.getByRole('button', { name: 'Add Surface Type' })).toBeVisible();

    await page.getByRole('button', { name: 'Add Surface Type' }).click();
    await expect(page.getByRole('dialog', { name: 'Add Surface Type' })).toBeVisible();
    await page.getByLabel('Surface Name *').fill('E2E Surface');
    await page.getByRole('button', { name: 'Add Surface Type' }).last().click();
    await expect(page.getByText('Surface type created successfully.')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByLabel('Surface Name *').fill('E2E Surface Updated');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Surface type updated successfully.')).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page.getByRole('button', { name: 'Delete Surface Type' }).click();
    await expect(page.getByText('Surface type deleted successfully.')).toBeVisible();
  });
});
