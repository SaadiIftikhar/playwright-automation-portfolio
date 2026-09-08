import { test as base, expect, type BrowserContext } from '@playwright/test';
import { BookstoreApi } from '../../shared/api-client';
import { newTenantId, TENANT_HEADER } from '../../shared/factories';
import { BookDetailPage } from '../pages/book-detail.page';
import { CartPage } from '../pages/cart.page';
import { CatalogPage } from '../pages/catalog.page';
import { InventoryPage } from '../pages/inventory.page';

type Fixtures = {
  tenantId: string;
  api: BookstoreApi;
  catalogPage: CatalogPage;
  bookDetailPage: BookDetailPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
};

export const test = base.extend<Fixtures>({
  tenantId: async ({}, use) => {
    await use(newTenantId());
  },

  // Stamping the tenant on the browser context means every request the page
  // makes — navigation and fetch alike — lands in this test's private dataset.
  context: async ({ context, tenantId }, use) => {
    await context.setExtraHTTPHeaders({ [TENANT_HEADER]: tenantId });
    await use(context as BrowserContext);
  },

  api: async ({ playwright, baseURL, tenantId }, use) => {
    const request = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { [TENANT_HEADER]: tenantId, Accept: 'application/json' },
    });
    await use(new BookstoreApi(request));
    await request.dispose();
  },

  catalogPage: async ({ page }, use) => {
    await use(new CatalogPage(page));
  },

  bookDetailPage: async ({ page }, use) => {
    await use(new BookDetailPage(page));
  },

  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },

  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
});

export { expect };
