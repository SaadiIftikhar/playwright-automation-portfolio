import { Router } from 'express';
import { DELAYS, ERROR_CODES, LIMITS } from '../constants.js';
import { ApiError, notFound, validationFailed } from '../errors.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cartPayload(store) {
  const items = store.cartItems();
  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)),
  };
}

export const cartRouter = Router();

cartRouter.get('/', (req, res) => {
  res.json({ data: cartPayload(req.store) });
});

cartRouter.post('/items', async (req, res) => {
  const body = req.body ?? {};
  const errors = [];

  if (typeof body.bookId !== 'string' || body.bookId.trim() === '') {
    errors.push({ field: 'bookId', message: 'bookId is required' });
  }
  const quantity = body.quantity ?? 1;
  if (!Number.isInteger(quantity)) {
    errors.push({ field: 'quantity', message: 'Quantity must be a whole number' });
  } else if (quantity < LIMITS.quantity.min || quantity > LIMITS.quantity.max) {
    errors.push({
      field: 'quantity',
      message: `Quantity must be between ${LIMITS.quantity.min} and ${LIMITS.quantity.max}`,
    });
  }
  for (const key of Object.keys(body)) {
    if (!['bookId', 'quantity'].includes(key)) {
      errors.push({ field: key, message: `Unknown field '${key}' is not allowed` });
    }
  }
  if (errors.length > 0) throw validationFailed(errors);

  const book = req.store.getBook(body.bookId);
  if (!book) throw notFound('Book', body.bookId);

  // Deliberate latency so the UI has a loading state worth testing.
  if (DELAYS.addToCart > 0) await sleep(DELAYS.addToCart);

  const current = req.store.cart.get(book.id) ?? 0;
  const requested = current + quantity;
  if (requested > book.stock) {
    throw new ApiError(
      409,
      ERROR_CODES.OUT_OF_STOCK,
      `Only ${book.stock} copies of '${book.title}' are available`,
      [{ field: 'quantity', message: `Requested ${requested}, available ${book.stock}` }],
    );
  }

  req.store.cart.set(book.id, requested);
  res.status(201).json({ data: cartPayload(req.store) });
});

cartRouter.delete('/items/:bookId', (req, res) => {
  if (!req.store.cart.has(req.params.bookId)) {
    throw notFound('Cart item', req.params.bookId);
  }
  req.store.cart.delete(req.params.bookId);
  res.status(204).end();
});

cartRouter.delete('/', (req, res) => {
  req.store.cart.clear();
  res.status(204).end();
});
