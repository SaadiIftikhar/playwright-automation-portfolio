import { bookInput, newTenantId, TENANT_HEADER } from '../../shared/factories';
import { SEED } from '../../shared/seed-facts';
import { GENRES } from '../../shared/types';
import { expect, test } from '../fixtures/test';
import {
  bookListEnvelopeSchema,
  expectError,
  expectSchema,
  healthEnvelopeSchema,
  metaEnvelopeSchema,
} from '../schemas';

const MISSING_ID = 'bk_000000';

test.describe('Error contract', () => {
  test('API-120 GET of a missing book returns a well-formed 404', async ({ request }) => {
    const response = await request.get(`/api/books/${MISSING_ID}`);

    const body = await expectError(response, 404, 'NOT_FOUND');
    expect(body.error.message).toBe(`Book with id '${MISSING_ID}' was not found`);
    expect(body.error.details).toEqual([]);
  });

  test('API-121 PUT of a missing book returns 404', async ({ request }) => {
    const response = await request.put(`/api/books/${MISSING_ID}`, { data: bookInput() });

    await expectError(response, 404, 'NOT_FOUND');
  });

  test('API-122 PATCH of a missing book returns 404', async ({ request }) => {
    const response = await request.patch(`/api/books/${MISSING_ID}`, {
      data: { price: 9.99 },
    });

    await expectError(response, 404, 'NOT_FOUND');
  });

  test('API-123 DELETE of a missing book returns 404', async ({ request }) => {
    const response = await request.delete(`/api/books/${MISSING_ID}`);

    await expectError(response, 404, 'NOT_FOUND');
  });

  test('API-124 a missing book is reported before the payload is validated', async ({
    request,
  }) => {
    const response = await request.put(`/api/books/${MISSING_ID}`, { data: {} });

    await expectError(response, 404, 'NOT_FOUND');
  });

  test('API-125 an unknown API route returns a well-formed 404', async ({ request }) => {
    const response = await request.get('/api/publishers');

    const body = await expectError(response, 404, 'NOT_FOUND');
    expect(body.error.message).toContain('GET');
  });

  test('API-126 every error response shares the same envelope', async ({
    request,
    books,
  }) => {
    const existing = await books.createBook(bookInput());

    const responses = [
      { response: await request.get(`/api/books/${MISSING_ID}`), status: 404 },
      { response: await request.post('/api/books', { data: {} }), status: 400 },
      {
        response: await request.post('/api/books', {
          data: bookInput({ isbn: existing.isbn }),
        }),
        status: 409,
      },
      {
        response: await request.post('/api/books', {
          headers: { 'Content-Type': 'text/plain' },
          data: 'nope',
        }),
        status: 415,
      },
      {
        response: await request.get('/api/books', { params: { limit: 0 } }),
        status: 400,
      },
    ];

    for (const { response, status } of responses) {
      await expectError(response, status, (await response.json()).error.code);
      expect(response.status()).toBe(status);
    }
  });

  test('API-127 successful responses are always JSON', async ({ request, books }) => {
    const book = await books.createBook(bookInput());

    for (const path of [
      '/api/books',
      `/api/books/${book.id}`,
      '/api/cart',
      '/api/health',
    ]) {
      const response = await request.get(path);
      expect(response.headers()['content-type'], `content type for ${path}`).toContain(
        'application/json',
      );
    }
  });

  test('API-128 the server does not advertise its framework', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.headers()['x-powered-by']).toBeUndefined();
  });
});

test.describe('Support endpoints', () => {
  test('API-129 the health endpoint reports status and uptime', async ({ request }) => {
    const response = await request.get('/api/health');

    const body = await expectSchema(response, healthEnvelopeSchema, 200);
    expect(body.data.status).toBe('ok');
  });

  test('API-130 the meta endpoint publishes the genres and field limits', async ({
    request,
  }) => {
    const response = await request.get('/api/meta');

    const body = await expectSchema(response, metaEnvelopeSchema, 200);
    expect(body.data.genres).toEqual([...GENRES]);
    expect(body.data.limits.price).toMatchObject({ min: 0.01, max: 999.99 });
    expect(body.data.limits.title).toMatchObject({ min: 1, max: 120 });
  });

  test('API-131 reset restores the seeded catalog', async ({ request, books }) => {
    const created = await books.createBook(bookInput());
    await request.delete(
      `/api/books/${(await books.listBooks({ limit: 1 })).data[0].id}`,
    );

    const response = await request.post('/api/test/reset', { data: { seed: true } });

    expect(response.status()).toBe(204);
    const list = await expectSchema(
      await request.get('/api/books', { params: { limit: 100 } }),
      bookListEnvelopeSchema,
      200,
    );
    expect(list.meta.total).toBe(SEED.totalBooks);
    expect(list.data.find((book) => book.id === created.id)).toBeUndefined();
  });

  test('API-132 reset can produce an empty catalog', async ({ request }) => {
    const response = await request.post('/api/test/reset', { data: { seed: false } });

    expect(response.status()).toBe(204);
    const list = await expectSchema(
      await request.get('/api/books'),
      bookListEnvelopeSchema,
      200,
    );
    expect(list.data).toEqual([]);
    expect(list.meta.totalPages).toBe(0);
  });
});

test.describe('Tenant isolation', () => {
  test('API-133 two tenants never see each other data', async ({
    playwright,
    baseURL,
  }) => {
    const first = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { [TENANT_HEADER]: newTenantId() },
    });
    const second = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { [TENANT_HEADER]: newTenantId() },
    });

    const created = await first.post('/api/books', {
      data: bookInput({ title: 'Private To Tenant One' }),
    });
    expect(created.status()).toBe(201);
    const { data } = await created.json();

    const fromOther = await second.get(`/api/books/${data.id}`);
    expect(fromOther.status()).toBe(404);

    const otherList = await second.get('/api/books', { params: { limit: 100 } });
    const otherBody = await otherList.json();
    expect(otherBody.meta.total).toBe(SEED.totalBooks);

    await first.dispose();
    await second.dispose();
  });

  test('API-134 a destructive reset in one tenant leaves the other untouched', async ({
    playwright,
    baseURL,
  }) => {
    const first = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { [TENANT_HEADER]: newTenantId() },
    });
    const second = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { [TENANT_HEADER]: newTenantId() },
    });

    await first.post('/api/test/reset', { data: { seed: false } });

    const firstList = await (await first.get('/api/books')).json();
    const secondList = await (
      await second.get('/api/books', { params: { limit: 100 } })
    ).json();

    expect(firstList.meta.total).toBe(0);
    expect(secondList.meta.total).toBe(SEED.totalBooks);

    await first.dispose();
    await second.dispose();
  });

  test('API-135 the resolved tenant is echoed back on the response', async ({
    request,
    tenantId,
  }) => {
    const response = await request.get('/api/health');

    expect(response.headers()['x-test-tenant']).toBe(tenantId);
  });
});
