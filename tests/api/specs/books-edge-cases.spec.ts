import { bookInput, repeat } from '../../shared/factories';
import { LIMITS } from '../../shared/types';
import { expect, test } from '../fixtures/test';
import {
  bookEnvelopeSchema,
  bookListEnvelopeSchema,
  expectError,
  expectSchema,
} from '../schemas';

test.describe('Boundary values', () => {
  test('API-070 accepts every field at its minimum', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: bookInput({
        title: 'x',
        author: 'y',
        price: LIMITS.price.min,
        stock: LIMITS.stock.min,
        publishedYear: LIMITS.publishedYear.min,
        description: '',
      }),
    });

    const body = await expectSchema(response, bookEnvelopeSchema, 201);
    expect(body.data).toMatchObject({
      title: 'x',
      price: LIMITS.price.min,
      stock: LIMITS.stock.min,
      publishedYear: LIMITS.publishedYear.min,
      description: '',
    });
  });

  test('API-071 accepts every field at its maximum', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: bookInput({
        title: repeat('t', LIMITS.title.max),
        author: repeat('a', LIMITS.author.max),
        price: LIMITS.price.max,
        stock: LIMITS.stock.max,
        publishedYear: LIMITS.publishedYear.max,
        description: repeat('d', LIMITS.description.max),
      }),
    });

    const body = await expectSchema(response, bookEnvelopeSchema, 201);
    expect(body.data.title).toHaveLength(LIMITS.title.max);
    expect(body.data.author).toHaveLength(LIMITS.author.max);
    expect(body.data.description).toHaveLength(LIMITS.description.max);
    expect(body.data.price).toBe(LIMITS.price.max);
    expect(body.data.stock).toBe(LIMITS.stock.max);
  });

  test('API-072 rejects a title one character past the maximum', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: bookInput({ title: repeat('t', LIMITS.title.max + 1) }),
    });

    await expectError(response, 400, 'VALIDATION_ERROR', ['title']);
  });

  test('API-073 rejects a price one cent past the maximum', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: bookInput({ price: LIMITS.price.max + 0.01 }),
    });

    await expectError(response, 400, 'VALIDATION_ERROR', ['price']);
  });

  test('API-074 rejects a price one cent below the minimum', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: bookInput({ price: 0 }),
    });

    await expectError(response, 400, 'VALIDATION_ERROR', ['price']);
  });

  test('API-075 rejects a stock level one past the maximum', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: bookInput({ stock: LIMITS.stock.max + 1 }),
    });

    await expectError(response, 400, 'VALIDATION_ERROR', ['stock']);
  });

  test('API-076 rejects sub-cent price precision', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: bookInput({ price: 0.001 }),
    });

    await expectError(response, 400, 'VALIDATION_ERROR', ['price']);
  });

  test('API-077 rejects a published year outside the allowed range', async ({
    request,
  }) => {
    const tooOld = await request.post('/api/books', {
      data: bookInput({ publishedYear: LIMITS.publishedYear.min - 1 }),
    });
    const tooNew = await request.post('/api/books', {
      data: bookInput({ publishedYear: LIMITS.publishedYear.max + 1 }),
    });

    await expectError(tooOld, 400, 'VALIDATION_ERROR', ['publishedYear']);
    await expectError(tooNew, 400, 'VALIDATION_ERROR', ['publishedYear']);
  });
});

test.describe('Empty and whitespace input', () => {
  test('API-078 rejects an empty title', async ({ request }) => {
    const response = await request.post('/api/books', { data: bookInput({ title: '' }) });

    await expectError(response, 400, 'VALIDATION_ERROR', ['title']);
  });

  test('API-079 rejects a whitespace-only title', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: bookInput({ title: '      ' }),
    });

    const body = await expectError(response, 400, 'VALIDATION_ERROR', ['title']);
    expect(body.error.details[0].message).toBe('Title is required');
  });

  test('API-080 accepts an empty description', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: bookInput({ description: '' }),
    });

    const body = await expectSchema(response, bookEnvelopeSchema, 201);
    expect(body.data.description).toBe('');
  });

  test('API-081 accepts an explicitly null published year', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: bookInput({ publishedYear: null }),
    });

    const body = await expectSchema(response, bookEnvelopeSchema, 201);
    expect(body.data.publishedYear).toBeNull();
  });

  test('API-082 accepts a stock level of zero', async ({ request }) => {
    const response = await request.post('/api/books', { data: bookInput({ stock: 0 }) });

    const body = await expectSchema(response, bookEnvelopeSchema, 201);
    expect(body.data.stock).toBe(0);
  });

  test('API-083 an empty search term returns the whole catalog', async ({ request }) => {
    const response = await request.get('/api/books', {
      params: { search: '', limit: 100 },
    });

    const body = await expectSchema(response, bookListEnvelopeSchema, 200);
    expect(body.meta.total).toBeGreaterThan(0);
  });
});

test.describe('Unusual content', () => {
  test('API-084 round-trips emoji and non-Latin characters', async ({ request }) => {
    const title = '🚀 星の航海 — Viaje Estelar';
    const author = 'Renée Ångström';

    const created = await expectSchema(
      await request.post('/api/books', { data: bookInput({ title, author }) }),
      bookEnvelopeSchema,
      201,
    );

    const fetched = await expectSchema(
      await request.get(`/api/books/${created.data.id}`),
      bookEnvelopeSchema,
      200,
    );
    expect(fetched.data.title).toBe(title);
    expect(fetched.data.author).toBe(author);
  });

  test('API-085 stores markup as literal text without escaping it', async ({
    request,
  }) => {
    const title = '<script>alert(1)</script>';

    const created = await expectSchema(
      await request.post('/api/books', { data: bookInput({ title }) }),
      bookEnvelopeSchema,
      201,
    );

    expect(created.data.title).toBe(title);
  });

  test('API-086 stores SQL-like input verbatim', async ({ request }) => {
    const title = "Robert'); DROP TABLE books;--";

    const created = await expectSchema(
      await request.post('/api/books', { data: bookInput({ title }) }),
      bookEnvelopeSchema,
      201,
    );

    expect(created.data.title).toBe(title);

    const list = await expectSchema(
      await request.get('/api/books', { params: { limit: 100 } }),
      bookListEnvelopeSchema,
      200,
    );
    expect(list.data.length).toBeGreaterThan(1);
  });

  test('API-087 finds a book whose title contains regex metacharacters', async ({
    request,
  }) => {
    const title = 'Everything (.*) and More';
    await request.post('/api/books', { data: bookInput({ title }) });

    const literal = await expectSchema(
      await request.get('/api/books', { params: { search: '(.*)' } }),
      bookListEnvelopeSchema,
      200,
    );
    expect(literal.meta.total).toBe(1);
    expect(literal.data[0].title).toBe(title);

    // Treated as a regex, '.*' would match the whole catalog. As a literal
    // substring it only matches the one title that actually contains it.
    const asRegex = await expectSchema(
      await request.get('/api/books', { params: { search: '.*', limit: 100 } }),
      bookListEnvelopeSchema,
      200,
    );
    expect(asRegex.meta.total).toBe(1);
    expect(asRegex.data[0].title).toBe(title);

    const noMatch = await expectSchema(
      await request.get('/api/books', { params: { search: '^.+$', limit: 100 } }),
      bookListEnvelopeSchema,
      200,
    );
    expect(noMatch.meta.total).toBe(0);
  });
});

test.describe('Payload and pagination limits', () => {
  test('API-088 rejects an oversized payload with 413', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: bookInput({ description: repeat('x', 200_000) }),
    });

    await expectError(response, 413, 'PAYLOAD_TOO_LARGE');
  });

  test('API-089 rejects a page size of zero', async ({ request }) => {
    const response = await request.get('/api/books', { params: { limit: 0 } });

    await expectError(response, 400, 'VALIDATION_ERROR', ['limit']);
  });

  test('API-090 rejects a page size above the maximum', async ({ request }) => {
    const response = await request.get('/api/books', { params: { limit: 9999 } });

    await expectError(response, 400, 'VALIDATION_ERROR', ['limit']);
  });

  test('API-091 accepts the largest allowed page size', async ({ request }) => {
    const response = await request.get('/api/books', { params: { limit: 100 } });

    const body = await expectSchema(response, bookListEnvelopeSchema, 200);
    expect(body.meta.limit).toBe(100);
  });
});
