import { Router } from 'express';
import { DELAYS } from '../constants.js';
import { duplicateIsbn, notFound, validationFailed } from '../errors.js';
import { applyQuery, parseListQuery } from '../query.js';
import { validateBook } from '../validation.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const booksRouter = Router();

booksRouter.get('/', async (req, res) => {
  const query = parseListQuery(req.query);
  if (DELAYS.list > 0) await sleep(DELAYS.list);
  const { items, meta } = applyQuery(req.store.listBooks(), query);
  res.json({ data: items, meta });
});

booksRouter.get('/:id', (req, res) => {
  const book = req.store.getBook(req.params.id);
  if (!book) throw notFound('Book', req.params.id);
  res.json({ data: book });
});

booksRouter.post('/', (req, res) => {
  const { value, errors } = validateBook(req.body);
  if (errors.length > 0) throw validationFailed(errors);
  if (req.store.findByIsbn(value.isbn)) throw duplicateIsbn(value.isbn);

  const book = req.store.insertBook(value);
  res.status(201).location(`/api/books/${book.id}`).json({ data: book });
});

booksRouter.put('/:id', (req, res) => {
  const existing = req.store.getBook(req.params.id);
  if (!existing) throw notFound('Book', req.params.id);

  const { value, errors } = validateBook(req.body);
  if (errors.length > 0) throw validationFailed(errors);
  if (req.store.findByIsbn(value.isbn, req.params.id)) {
    throw duplicateIsbn(value.isbn);
  }

  res.json({ data: req.store.replaceBook(req.params.id, value) });
});

booksRouter.patch('/:id', (req, res) => {
  const existing = req.store.getBook(req.params.id);
  if (!existing) throw notFound('Book', req.params.id);

  const { value, errors } = validateBook(req.body, { partial: true });
  if (errors.length > 0) throw validationFailed(errors);
  if (value.isbn && req.store.findByIsbn(value.isbn, req.params.id)) {
    throw duplicateIsbn(value.isbn);
  }

  res.json({ data: req.store.replaceBook(req.params.id, { ...existing, ...value }) });
});

booksRouter.delete('/:id', (req, res) => {
  if (!req.store.getBook(req.params.id)) throw notFound('Book', req.params.id);
  req.store.deleteBook(req.params.id);
  res.status(204).end();
});
