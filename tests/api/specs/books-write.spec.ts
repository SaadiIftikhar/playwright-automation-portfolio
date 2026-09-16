import { bookInput } from '../../shared/factories';
import { SEED } from '../../shared/seed-facts';
import { expect, test } from '../fixtures/test';
import { bookEnvelopeSchema, bookListEnvelopeSchema, expectSchema } from '../schemas';

test.describe('POST /api/books', () => {
  test('API-020 creates a book and returns 201 with a Location header', async ({
    request,
  }) => {
    const input = bookInput({ title: 'Created Over HTTP' });

    const response = await request.post('/api/books', { data: input });

    const body = await expectSchema(response, bookEnvelopeSchema, 201);
    expect(response.headers().location).toBe(`/api/books/${body.data.id}`);
    expect(body.data).toMatchObject({
      title: input.title,
      author: input.author,
      isbn: input.isbn,
      price: input.price,
      stock: input.stock,
      genre: input.genre,
      description: input.description,
      publishedYear: input.publishedYear,
    });
  });

  test('API-021 a created book is immediately readable', async ({ request }) => {
    const input = bookInput({ title: 'Read After Write' });

    const created = await expectSchema(
      await request.post('/api/books', { data: input }),
      bookEnvelopeSchema,
      201,
    );

    const fetched = await expectSchema(
      await request.get(`/api/books/${created.data.id}`),
      bookEnvelopeSchema,
      200,
    );
    expect(fetched.data).toEqual(created.data);
  });

  test('API-022 normalises a hyphenated ISBN before storing it', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: bookInput({ isbn: '978-0-596-52068-7' }),
    });

    const body = await expectSchema(response, bookEnvelopeSchema, 201);
    expect(body.data.isbn).toBe('9780596520687');
  });

  test('API-023 fills in defaults for the optional fields', async ({ request }) => {
    const input = bookInput();
    delete (input as Partial<typeof input>).description;
    delete (input as Partial<typeof input>).publishedYear;

    const response = await request.post('/api/books', { data: input });

    const body = await expectSchema(response, bookEnvelopeSchema, 201);
    expect(body.data.description).toBe('');
    expect(body.data.publishedYear).toBeNull();
  });

  test('API-024 trims surrounding whitespace', async ({ request }) => {
    const response = await request.post('/api/books', {
      data: bookInput({ title: '  Padded  ', author: '  Writer  ' }),
    });

    const body = await expectSchema(response, bookEnvelopeSchema, 201);
    expect(body.data.title).toBe('Padded');
    expect(body.data.author).toBe('Writer');
  });

  test('API-025 sets createdAt and updatedAt to the same value on creation', async ({
    request,
  }) => {
    const response = await request.post('/api/books', { data: bookInput() });

    const body = await expectSchema(response, bookEnvelopeSchema, 201);
    expect(body.data.createdAt).toBe(body.data.updatedAt);
  });
});

test.describe('PUT /api/books/:id', () => {
  test('API-026 replaces every field on the book', async ({ request, books }) => {
    const created = await books.createBook(bookInput({ title: 'Before Replace' }));
    const replacement = bookInput({
      title: 'After Replace',
      price: 44.44,
      stock: 99,
      genre: 'biography',
      publishedYear: 1990,
      description: 'Replaced wholesale.',
    });

    const response = await request.put(`/api/books/${created.id}`, { data: replacement });

    const body = await expectSchema(response, bookEnvelopeSchema, 200);
    expect(body.data).toMatchObject({
      id: created.id,
      title: 'After Replace',
      price: 44.44,
      stock: 99,
      genre: 'biography',
      publishedYear: 1990,
      description: 'Replaced wholesale.',
    });
  });

  test('API-027 preserves createdAt and advances updatedAt', async ({
    request,
    books,
  }) => {
    const created = await books.createBook(bookInput());

    const response = await request.put(`/api/books/${created.id}`, {
      data: bookInput({ isbn: created.isbn, title: 'Timestamp Check' }),
    });

    const body = await expectSchema(response, bookEnvelopeSchema, 200);
    expect(body.data.createdAt).toBe(created.createdAt);
    expect(Date.parse(body.data.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(created.updatedAt),
    );
  });

  test('API-028 keeping its own ISBN is not treated as a duplicate', async ({
    request,
    books,
  }) => {
    const created = await books.createBook(bookInput());

    const response = await request.put(`/api/books/${created.id}`, {
      data: bookInput({ isbn: created.isbn, title: 'Same ISBN, New Title' }),
    });

    await expectSchema(response, bookEnvelopeSchema, 200);
  });
});

test.describe('PATCH /api/books/:id', () => {
  test('API-029 updates only the supplied field', async ({ request, books }) => {
    const created = await books.createBook(bookInput({ price: 10.0, stock: 3 }));

    const response = await request.patch(`/api/books/${created.id}`, {
      data: { price: 12.34 },
    });

    const body = await expectSchema(response, bookEnvelopeSchema, 200);
    expect(body.data.price).toBe(12.34);
    expect(body.data).toMatchObject({
      title: created.title,
      author: created.author,
      isbn: created.isbn,
      stock: created.stock,
      genre: created.genre,
      description: created.description,
      publishedYear: created.publishedYear,
    });
  });

  test('API-030 can update several fields at once', async ({ request, books }) => {
    const created = await books.createBook(bookInput());

    const response = await request.patch(`/api/books/${created.id}`, {
      data: { stock: 0, genre: 'mystery' },
    });

    const body = await expectSchema(response, bookEnvelopeSchema, 200);
    expect(body.data).toMatchObject({ stock: 0, genre: 'mystery', title: created.title });
  });
});

test.describe('DELETE /api/books/:id', () => {
  test('API-031 removes the book and returns 204 with no body', async ({
    request,
    books,
  }) => {
    const created = await books.createBook(bookInput({ title: 'To Be Deleted' }));

    const response = await request.delete(`/api/books/${created.id}`);

    expect(response.status()).toBe(204);
    expect(await response.text()).toBe('');

    const follow = await request.get(`/api/books/${created.id}`);
    expect(follow.status()).toBe(404);
  });

  test('API-032 leaves the rest of the catalog intact', async ({ request, books }) => {
    const created = await books.createBook(bookInput());

    await request.delete(`/api/books/${created.id}`);

    const body = await expectSchema(
      await request.get('/api/books', { params: { limit: 100 } }),
      bookListEnvelopeSchema,
      200,
    );
    expect(body.meta.total).toBe(SEED.totalBooks);
  });
});
