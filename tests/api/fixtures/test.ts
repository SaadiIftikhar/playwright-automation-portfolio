import { test as base, expect } from '@playwright/test';
import { BookstoreApi } from '../../shared/api-client';
import { newTenantId, TENANT_HEADER } from '../../shared/factories';

type Fixtures = {
  tenantId: string;
  /** Typed helper for arranging state; assertions still go through `request`. */
  books: BookstoreApi;
};

export const test = base.extend<Fixtures>({
  tenantId: async ({}, use) => {
    await use(newTenantId());
  },

  // Overriding the built-in request fixture means specs use `request` exactly
  // as they normally would, but every call is scoped to this test's tenant.
  request: async ({ playwright, baseURL, tenantId }, use) => {
    const context = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { [TENANT_HEADER]: tenantId, Accept: 'application/json' },
    });
    await use(context);
    await context.dispose();
  },

  books: async ({ request }, use) => {
    await use(new BookstoreApi(request));
  },
});

export { expect };
