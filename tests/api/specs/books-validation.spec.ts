import { bookInput } from '../../shared/factories';
import { expect, test } from '../fixtures/test';
import { expectError } from '../schemas';

const REQUIRED_FIELDS = ['title', 'author', 'isbn', 'price', 'stock', 'genre'] as const;

test.describe('POST /api/books validation', () => {
  test('API-040 an empty body reports every required field', async ({ request }) => {
    const response = await request.post('/api/books', { data: {} });

    await expectError(response, 400, 'VALIDATION_ERROR', [...REQUIRED_FIELDS]);
  });

  for (const field of REQUIRED_FIELDS) {
    test(`API-041 rejects a payload missing ${field}`, async ({ request }) => {
      const input: Record<string, unknown> = { ...bookInput() };
      delete input[field];

      const response = await request.post('/api/books', { data: input });

      await expectError(response, 400, 'VALIDATION_ERROR', [field]);
    });
  }

  test('API-042 rejects a numeric title', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: { ...bookInput(), title: 12345 },
    });

    const body = await expectError(response, 400, 'VALIDATION_ERROR', ['title']);
    expect(body.error.details[0].message).toBe('Title must be a string');
  });

  test('API-043 rejects a price sent as a string', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: { ...bookInput(), price: '19.99' },
    });

    const body = await expectError(response, 400, 'VALIDATION_ERROR', ['price']);
    expect(body.error.details[0].message).toBe('Price must be a number');
  });

  test('API-044 rejects a genre sent as an array', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: { ...bookInput(), genre: ['fiction'] },
    });

    await expectError(response, 400, 'VALIDATION_ERROR', ['genre']);
  });

  test('API-045 rejects a genre outside the allowed set', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: { ...bookInput(), genre: 'horror' },
    });

    const body = await expectError(response, 400, 'VALIDATION_ERROR', ['genre']);
    expect(body.error.details[0].message).toContain('Genre must be one of');
  });

  test('API-046 rejects a fractional stock level', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: { ...bookInput(), stock: 2.5 },
    });

    const body = await expectError(response, 400, 'VALIDATION_ERROR', ['stock']);
    expect(body.error.details[0].message).toBe('Stock must be a whole number');
  });

  test('API-047 rejects a malformed ISBN', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: { ...bookInput(), isbn: 'not-an-isbn' },
    });

    await expectError(response, 400, 'VALIDATION_ERROR', ['isbn']);
  });

  test('API-048 rejects a 13 digit ISBN with an invalid prefix', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: { ...bookInput(), isbn: '1234567890123' },
    });

    await expectError(response, 400, 'VALIDATION_ERROR', ['isbn']);
  });

  test('API-049 rejects a duplicate ISBN with 409', async ({ request, books }) => {
    const existing = await books.createBook(bookInput());

    const response = await request.post('/api/books', {
      data: bookInput({ isbn: existing.isbn }),
    });

    const body = await expectError(response, 409, 'DUPLICATE_ISBN', ['isbn']);
    expect(body.error.message).toContain(existing.isbn);
  });

  test('API-050 rejects an unknown field', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: { ...bookInput(), publisher: 'Unexpected Ltd' },
    });

    const body = await expectError(response, 400, 'VALIDATION_ERROR', ['publisher']);
    expect(body.error.details[0].message).toContain("Unknown field 'publisher'");
  });

  test('API-051 reports several problems in one response', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: { title: '', author: '', isbn: 'x', price: -1, stock: -1, genre: 'nope' },
    });

    await expectError(response, 400, 'VALIDATION_ERROR', [...REQUIRED_FIELDS]);
  });

  test('API-052 rejects a body that is an array', async ({ request }) => {
    const response = await request.post('/api/books', { data: [bookInput()] });

    await expectError(response, 400, 'VALIDATION_ERROR', ['body']);
  });

  test('API-053 rejects malformed JSON with 400', async ({ request }) => {
    const response = await request.post('/api/books', {
      headers: { 'Content-Type': 'application/json' },
      data: '{"title": "unterminated',
    });

    await expectError(response, 400, 'MALFORMED_JSON');
  });

  test('API-054 rejects a non-JSON content type with 415', async ({ request }) => {
    const response = await request.post('/api/books', {
      headers: { 'Content-Type': 'text/plain' },
      data: 'title=Whatever',
    });

    await expectError(response, 415, 'UNSUPPORTED_MEDIA_TYPE');
  });

  test('API-055 rejects a form-encoded body with 415', async ({ request }) => {
    const response = await request.post('/api/books', {
      form: { title: 'Form Book', author: 'Someone' },
    });

    await expectError(response, 415, 'UNSUPPORTED_MEDIA_TYPE');
  });
});

test.describe('PUT and PATCH validation', () => {
  test('API-056 PUT requires the complete payload', async ({ request, books }) => {
    const created = await books.createBook(bookInput());

    const response = await request.put(`/api/books/${created.id}`, {
      data: { title: 'Only A Title' },
    });

    await expectError(response, 400, 'VALIDATION_ERROR', [
      'author',
      'isbn',
      'price',
      'stock',
      'genre',
    ]);
  });

  test('API-057 PATCH rejects an empty body', async ({ request, books }) => {
    const created = await books.createBook(bookInput());

    const response = await request.patch(`/api/books/${created.id}`, { data: {} });

    const body = await expectError(response, 400, 'VALIDATION_ERROR', ['body']);
    expect(body.error.details[0].message).toBe('At least one field must be provided');
  });

  test('API-058 PATCH validates the fields it is given', async ({ request, books }) => {
    const created = await books.createBook(bookInput());

    const response = await request.patch(`/api/books/${created.id}`, {
      data: { price: 0 },
    });

    await expectError(response, 400, 'VALIDATION_ERROR', ['price']);
  });

  test('API-059 PATCH rejects an ISBN already used by another book', async ({
    request,
    books,
  }) => {
    const first = await books.createBook(bookInput());
    const second = await books.createBook(bookInput());

    const response = await request.patch(`/api/books/${second.id}`, {
      data: { isbn: first.isbn },
    });

    await expectError(response, 409, 'DUPLICATE_ISBN', ['isbn']);
  });
});

test.describe('Query parameter validation', () => {
  test('API-060 rejects an unknown genre filter', async ({ request }) => {
    const response = await request.get('/api/books', { params: { genre: 'horror' } });

    await expectError(response, 400, 'VALIDATION_ERROR', ['genre']);
  });

  test('API-061 rejects a non-numeric price filter', async ({ request }) => {
    const response = await request.get('/api/books', { params: { minPrice: 'cheap' } });

    await expectError(response, 400, 'VALIDATION_ERROR', ['minPrice']);
  });

  test('API-062 rejects an unsupported sort field', async ({ request }) => {
    const response = await request.get('/api/books', { params: { sort: 'popularity' } });

    await expectError(response, 400, 'VALIDATION_ERROR', ['sort']);
  });

  test('API-063 rejects a non-boolean stock filter', async ({ request }) => {
    const response = await request.get('/api/books', { params: { inStock: 'yes' } });

    await expectError(response, 400, 'VALIDATION_ERROR', ['inStock']);
  });

  test('API-064 rejects an unknown query parameter', async ({ request }) => {
    const response = await request.get('/api/books', { params: { orderBy: 'title' } });

    await expectError(response, 400, 'VALIDATION_ERROR', ['orderBy']);
  });

  test('API-065 rejects a page number below one', async ({ request }) => {
    const response = await request.get('/api/books', { params: { page: 0 } });

    await expectError(response, 400, 'VALIDATION_ERROR', ['page']);
  });

  test('API-066 rejects a fractional page number', async ({ request }) => {
    const response = await request.get('/api/books', { params: { page: 1.5 } });

    await expectError(response, 400, 'VALIDATION_ERROR', ['page']);
  });
});
