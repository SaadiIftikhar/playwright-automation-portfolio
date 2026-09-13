import { bookInput } from '../../shared/factories';
import { expect, test } from '../fixtures/test';
import { cartEnvelopeSchema, expectError, expectSchema } from '../schemas';

test.describe('Cart API', () => {
  test('API-100 a new tenant starts with an empty cart', async ({ request }) => {
    const response = await request.get('/api/cart');

    const body = await expectSchema(response, cartEnvelopeSchema, 200);
    expect(body.data).toEqual({ items: [], itemCount: 0, subtotal: 0 });
  });

  test('API-101 adding an item returns 201 and the updated cart', async ({
    request,
    books,
  }) => {
    const book = await books.createBook(bookInput({ price: 20.0, stock: 10 }));

    const response = await request.post('/api/cart/items', {
      data: { bookId: book.id, quantity: 2 },
    });

    const body = await expectSchema(response, cartEnvelopeSchema, 201);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]).toMatchObject({
      bookId: book.id,
      title: book.title,
      price: 20.0,
      quantity: 2,
      lineTotal: 40.0,
    });
    expect(body.data).toMatchObject({ itemCount: 2, subtotal: 40.0 });
  });

  test('API-102 quantity defaults to one', async ({ request, books }) => {
    const book = await books.createBook(bookInput({ stock: 5 }));

    const response = await request.post('/api/cart/items', { data: { bookId: book.id } });

    const body = await expectSchema(response, cartEnvelopeSchema, 201);
    expect(body.data.items[0].quantity).toBe(1);
  });

  test('API-103 adding the same book again increments the quantity', async ({
    request,
    books,
  }) => {
    const book = await books.createBook(bookInput({ price: 10.0, stock: 10 }));

    await request.post('/api/cart/items', { data: { bookId: book.id, quantity: 2 } });
    const response = await request.post('/api/cart/items', {
      data: { bookId: book.id, quantity: 3 },
    });

    const body = await expectSchema(response, cartEnvelopeSchema, 201);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].quantity).toBe(5);
    expect(body.data.subtotal).toBe(50.0);
  });

  test('API-104 totals add up across several titles', async ({ request, books }) => {
    const first = await books.createBook(bookInput({ price: 12.5, stock: 10 }));
    const second = await books.createBook(bookInput({ price: 7.25, stock: 10 }));

    await request.post('/api/cart/items', { data: { bookId: first.id, quantity: 2 } });
    const response = await request.post('/api/cart/items', {
      data: { bookId: second.id, quantity: 4 },
    });

    const body = await expectSchema(response, cartEnvelopeSchema, 201);
    expect(body.data.itemCount).toBe(6);
    expect(body.data.subtotal).toBe(54.0);
  });

  test('API-105 refuses to add more copies than are in stock', async ({
    request,
    books,
  }) => {
    const book = await books.createBook(bookInput({ stock: 3 }));

    const response = await request.post('/api/cart/items', {
      data: { bookId: book.id, quantity: 4 },
    });

    const body = await expectError(response, 409, 'OUT_OF_STOCK', ['quantity']);
    expect(body.error.message).toContain('Only 3 copies');
  });

  test('API-106 counts what is already in the cart against stock', async ({
    request,
    books,
  }) => {
    const book = await books.createBook(bookInput({ stock: 3 }));
    await request.post('/api/cart/items', { data: { bookId: book.id, quantity: 2 } });

    const response = await request.post('/api/cart/items', {
      data: { bookId: book.id, quantity: 2 },
    });

    await expectError(response, 409, 'OUT_OF_STOCK', ['quantity']);
  });

  test('API-107 returns 404 for a book that does not exist', async ({ request }) => {
    const response = await request.post('/api/cart/items', {
      data: { bookId: 'bk_missing' },
    });

    await expectError(response, 404, 'NOT_FOUND');
  });

  test('API-108 rejects a missing bookId', async ({ request }) => {
    const response = await request.post('/api/cart/items', { data: { quantity: 1 } });

    await expectError(response, 400, 'VALIDATION_ERROR', ['bookId']);
  });

  test('API-109 rejects a zero or negative quantity', async ({ request, books }) => {
    const book = await books.createBook(bookInput());

    const zero = await request.post('/api/cart/items', {
      data: { bookId: book.id, quantity: 0 },
    });
    const negative = await request.post('/api/cart/items', {
      data: { bookId: book.id, quantity: -2 },
    });

    await expectError(zero, 400, 'VALIDATION_ERROR', ['quantity']);
    await expectError(negative, 400, 'VALIDATION_ERROR', ['quantity']);
  });

  test('API-110 rejects a fractional quantity', async ({ request, books }) => {
    const book = await books.createBook(bookInput());

    const response = await request.post('/api/cart/items', {
      data: { bookId: book.id, quantity: 1.5 },
    });

    await expectError(response, 400, 'VALIDATION_ERROR', ['quantity']);
  });

  test('API-111 rejects an unknown field on the cart payload', async ({
    request,
    books,
  }) => {
    const book = await books.createBook(bookInput());

    const response = await request.post('/api/cart/items', {
      data: { bookId: book.id, giftWrap: true },
    });

    await expectError(response, 400, 'VALIDATION_ERROR', ['giftWrap']);
  });

  test('API-112 removes a single line and returns 204', async ({ request, books }) => {
    const first = await books.createBook(bookInput({ price: 10, stock: 5 }));
    const second = await books.createBook(bookInput({ price: 5, stock: 5 }));
    await request.post('/api/cart/items', { data: { bookId: first.id } });
    await request.post('/api/cart/items', { data: { bookId: second.id } });

    const response = await request.delete(`/api/cart/items/${first.id}`);

    expect(response.status()).toBe(204);
    const cart = await expectSchema(
      await request.get('/api/cart'),
      cartEnvelopeSchema,
      200,
    );
    expect(cart.data.items).toHaveLength(1);
    expect(cart.data.subtotal).toBe(5);
  });

  test('API-113 returns 404 when removing a line that is not in the cart', async ({
    request,
    books,
  }) => {
    const book = await books.createBook(bookInput());

    const response = await request.delete(`/api/cart/items/${book.id}`);

    await expectError(response, 404, 'NOT_FOUND');
  });

  test('API-114 clears the whole cart', async ({ request, books }) => {
    const book = await books.createBook(bookInput({ stock: 5 }));
    await request.post('/api/cart/items', { data: { bookId: book.id, quantity: 3 } });

    const response = await request.delete('/api/cart');

    expect(response.status()).toBe(204);
    const cart = await expectSchema(
      await request.get('/api/cart'),
      cartEnvelopeSchema,
      200,
    );
    expect(cart.data).toEqual({ items: [], itemCount: 0, subtotal: 0 });
  });

  test('API-115 clearing an already empty cart still succeeds', async ({ request }) => {
    const response = await request.delete('/api/cart');

    expect(response.status()).toBe(204);
  });

  test('API-116 deleting a book drops it from the cart', async ({ request, books }) => {
    const book = await books.createBook(bookInput({ stock: 5 }));
    await request.post('/api/cart/items', { data: { bookId: book.id, quantity: 2 } });

    await request.delete(`/api/books/${book.id}`);

    const cart = await expectSchema(
      await request.get('/api/cart'),
      cartEnvelopeSchema,
      200,
    );
    expect(cart.data.items).toEqual([]);
  });
});
