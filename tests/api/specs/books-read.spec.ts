import { SEED } from '../../shared/seed-facts';
import { expect, test } from '../fixtures/test';
import { bookEnvelopeSchema, bookListEnvelopeSchema, expectSchema } from '../schemas';

test.describe('GET /api/books', () => {
  test('API-001 returns the catalog in the documented list envelope', async ({ request }) => {
    const response = await request.get('/api/books', { params: { limit: 100 } });

    const body = await expectSchema(response, bookListEnvelopeSchema, 200);

    expect(body.data).toHaveLength(SEED.totalBooks);
    expect(body.meta).toMatchObject({
      total: SEED.totalBooks,
      count: SEED.totalBooks,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
  });

  test('API-002 defaults to page 1 with a limit of 20', async ({ request }) => {
    const response = await request.get('/api/books');

    const body = await expectSchema(response, bookListEnvelopeSchema, 200);

    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(20);
  });

  test('API-003 filters by a title substring', async ({ request }) => {
    const response = await request.get('/api/books', {
      params: { search: SEED.sample.title },
    });

    const body = await expectSchema(response, bookListEnvelopeSchema, 200);

    expect(body.meta.total).toBe(1);
    expect(body.data[0].title).toBe(SEED.sample.title);
  });

  test('API-004 filters by author', async ({ request }) => {
    const response = await request.get('/api/books', {
      params: { search: SEED.authorWithTwoBooks.name },
    });

    const body = await expectSchema(response, bookListEnvelopeSchema, 200);

    expect(body.meta.total).toBe(SEED.authorWithTwoBooks.count);
    for (const book of body.data) {
      expect(book.author).toBe(SEED.authorWithTwoBooks.name);
    }
  });

  test('API-005 search ignores case', async ({ request }) => {
    const upper = await request.get('/api/books', {
      params: { search: SEED.authorWithTwoBooks.name.toUpperCase() },
    });
    const lower = await request.get('/api/books', {
      params: { search: SEED.authorWithTwoBooks.name.toLowerCase() },
    });

    const upperBody = await expectSchema(upper, bookListEnvelopeSchema, 200);
    const lowerBody = await expectSchema(lower, bookListEnvelopeSchema, 200);

    expect(upperBody.meta.total).toBe(SEED.authorWithTwoBooks.count);
    expect(lowerBody.meta.total).toBe(SEED.authorWithTwoBooks.count);
  });

  test('API-006 filters by genre', async ({ request }) => {
    const response = await request.get('/api/books', { params: { genre: 'poetry' } });

    const body = await expectSchema(response, bookListEnvelopeSchema, 200);

    expect(body.meta.total).toBe(SEED.genreCounts.poetry);
    for (const book of body.data) expect(book.genre).toBe('poetry');
  });

  test('API-007 filters out books with no stock', async ({ request }) => {
    const response = await request.get('/api/books', {
      params: { inStock: 'true', limit: 100 },
    });

    const body = await expectSchema(response, bookListEnvelopeSchema, 200);

    expect(body.meta.total).toBe(SEED.inStockBooks);
    for (const book of body.data) expect(book.stock).toBeGreaterThan(0);
  });

  test('API-008 filters by a price range', async ({ request }) => {
    const response = await request.get('/api/books', {
      params: { minPrice: 12, maxPrice: 20, limit: 100 },
    });

    const body = await expectSchema(response, bookListEnvelopeSchema, 200);

    expect(body.data.length).toBeGreaterThan(0);
    for (const book of body.data) {
      expect(book.price).toBeGreaterThanOrEqual(12);
      expect(book.price).toBeLessThanOrEqual(20);
    }
  });

  test('API-009 sorts by price in both directions', async ({ request }) => {
    const ascending = await expectSchema(
      await request.get('/api/books', { params: { sort: 'price', limit: 100 } }),
      bookListEnvelopeSchema,
      200,
    );
    const descending = await expectSchema(
      await request.get('/api/books', { params: { sort: '-price', limit: 100 } }),
      bookListEnvelopeSchema,
      200,
    );

    const ascendingPrices = ascending.data.map((book) => book.price);
    const descendingPrices = descending.data.map((book) => book.price);

    expect(ascendingPrices).toEqual([...ascendingPrices].sort((a, b) => a - b));
    expect(descendingPrices).toEqual([...descendingPrices].sort((a, b) => b - a));
    expect(ascending.data[0].title).toBe(SEED.cheapest.title);
    expect(descending.data[0].title).toBe(SEED.mostExpensive.title);
  });

  test('API-010 sorts by title in both directions', async ({ request }) => {
    const ascending = await expectSchema(
      await request.get('/api/books', { params: { sort: 'title', limit: 100 } }),
      bookListEnvelopeSchema,
      200,
    );
    const descending = await expectSchema(
      await request.get('/api/books', { params: { sort: '-title', limit: 100 } }),
      bookListEnvelopeSchema,
      200,
    );

    expect(ascending.data[0].title).toBe(SEED.firstByTitleAsc);
    expect(descending.data[0].title).toBe(SEED.firstByTitleDesc);
  });

  test('API-011 paginates the catalog', async ({ request }) => {
    const first = await expectSchema(
      await request.get('/api/books', { params: { page: 1, limit: 5 } }),
      bookListEnvelopeSchema,
      200,
    );
    const second = await expectSchema(
      await request.get('/api/books', { params: { page: 2, limit: 5 } }),
      bookListEnvelopeSchema,
      200,
    );

    expect(first.data).toHaveLength(5);
    expect(second.data).toHaveLength(5);
    expect(first.meta).toMatchObject({ total: SEED.totalBooks, totalPages: 3, page: 1 });
    expect(second.meta.page).toBe(2);

    const firstIds = first.data.map((book) => book.id);
    const secondIds = second.data.map((book) => book.id);
    expect(firstIds.filter((id) => secondIds.includes(id))).toEqual([]);
  });

  test('API-012 the final page returns the remainder', async ({ request }) => {
    const response = await request.get('/api/books', { params: { page: 3, limit: 5 } });

    const body = await expectSchema(response, bookListEnvelopeSchema, 200);

    expect(body.data).toHaveLength(2);
    expect(body.meta.count).toBe(2);
  });

  test('API-013 a page past the end returns an empty list, not a 404', async ({ request }) => {
    const response = await request.get('/api/books', { params: { page: 99, limit: 5 } });

    const body = await expectSchema(response, bookListEnvelopeSchema, 200);

    expect(body.data).toEqual([]);
    expect(body.meta).toMatchObject({ total: SEED.totalBooks, count: 0, page: 99 });
  });

  test('API-014 a search with no matches returns an empty list', async ({ request }) => {
    const response = await request.get('/api/books', {
      params: { search: 'no-book-has-this-title' },
    });

    const body = await expectSchema(response, bookListEnvelopeSchema, 200);

    expect(body.data).toEqual([]);
    expect(body.meta).toMatchObject({ total: 0, count: 0, totalPages: 0 });
  });

  test('API-015 combines search, genre and stock filters', async ({ request }) => {
    const response = await request.get('/api/books', {
      params: {
        search: SEED.narrowing.author,
        genre: SEED.narrowing.genre,
        inStock: 'true',
      },
    });

    const body = await expectSchema(response, bookListEnvelopeSchema, 200);

    expect(body.meta.total).toBe(SEED.narrowing.inStockCount);
    expect(body.data[0].title).toBe(SEED.narrowing.inStockTitle);
  });
});

test.describe('GET /api/books/:id', () => {
  test('API-016 returns a single book in the documented envelope', async ({
    request,
    books,
  }) => {
    const target = (await books.listBooks({ search: SEED.sample.title })).data[0];

    const response = await request.get(`/api/books/${target.id}`);

    const body = await expectSchema(response, bookEnvelopeSchema, 200);
    expect(body.data).toMatchObject({
      id: target.id,
      title: SEED.sample.title,
      author: SEED.sample.author,
      genre: SEED.sample.genre,
      stock: SEED.sample.stock,
    });
  });

  test('API-017 exposes timestamps as ISO-8601 strings', async ({ request, books }) => {
    const target = (await books.listBooks({ limit: 1 })).data[0];

    const response = await request.get(`/api/books/${target.id}`);

    const body = await expectSchema(response, bookEnvelopeSchema, 200);
    expect(new Date(body.data.createdAt).toISOString()).toBe(body.data.createdAt);
    expect(new Date(body.data.updatedAt).toISOString()).toBe(body.data.updatedAt);
  });
});
