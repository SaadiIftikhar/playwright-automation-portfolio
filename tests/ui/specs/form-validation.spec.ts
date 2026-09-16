import { bookInput, repeat } from '../../shared/factories';
import { LIMITS, SEEDED_BOOK_COUNT } from '../../shared/types';
import { expect, test } from '../fixtures/test';

const CURRENT_YEAR = new Date().getFullYear();

test.describe('Book form validation', () => {
  test.beforeEach(async ({ inventoryPage }) => {
    await inventoryPage.goto();
    await inventoryPage.openAddForm();
  });

  test('VAL-001 an empty submission reports every required field', async ({
    inventoryPage,
  }) => {
    const { form } = inventoryPage;
    await form.save();

    await form.expectFieldError('title', 'Title is required');
    await form.expectFieldError('author', 'Author is required');
    await form.expectFieldError('isbn', 'ISBN is required');
    await form.expectFieldError('price', 'Price is required');
    await form.expectFieldError('stock', 'Stock is required');
    await form.expectFieldError('genre', 'Genre is required');
    await expect(form.visibleErrors).toHaveCount(6);
    await expect(form.root).toBeVisible();
  });

  test('VAL-002 a single missing field is reported on its own', async ({
    inventoryPage,
  }) => {
    const { form } = inventoryPage;
    const book = bookInput();

    await form.fill({ ...book, title: '' });
    await form.save();

    await form.expectFieldError('title', 'Title is required');
    await form.expectNoFieldError('author');
    await form.expectNoFieldError('isbn');
    await form.expectNoFieldError('price');
    await expect(form.visibleErrors).toHaveCount(1);
  });

  test('VAL-003 rejects an ISBN that is not 13 digits', async ({ inventoryPage }) => {
    const { form } = inventoryPage;

    await form.submit({ ...bookInput(), isbn: '12345' });

    await form.expectFieldError(
      'isbn',
      'ISBN must be 13 digits beginning with 978 or 979',
    );
  });

  test('VAL-004 rejects a 13 digit ISBN with the wrong prefix', async ({
    inventoryPage,
  }) => {
    const { form } = inventoryPage;

    await form.submit({ ...bookInput(), isbn: '1234567890123' });

    await form.expectFieldError(
      'isbn',
      'ISBN must be 13 digits beginning with 978 or 979',
    );
  });

  test('VAL-005 surfaces the server duplicate-ISBN error on the ISBN field', async ({
    inventoryPage,
    api,
  }) => {
    const existing = bookInput({ title: 'Original Edition' });
    await api.createBook(existing);

    const { form } = inventoryPage;
    await form.submit({ ...bookInput({ title: 'Reprint' }), isbn: existing.isbn });

    await form.expectFieldError('isbn', 'ISBN must be unique');
    expect(await api.findByTitle('Reprint')).toBeUndefined();
  });

  test('VAL-006 rejects a price below the minimum', async ({ inventoryPage }) => {
    const { form } = inventoryPage;

    await form.submit({ ...bookInput(), price: 0 });

    await form.expectFieldError('price', `Price must be at least ${LIMITS.price.min}`);
  });

  test('VAL-007 rejects a negative price', async ({ inventoryPage }) => {
    const { form } = inventoryPage;

    await form.submit({ ...bookInput(), price: -5 });

    await form.expectFieldError('price', `Price must be at least ${LIMITS.price.min}`);
  });

  test('VAL-008 rejects a non-numeric price', async ({ inventoryPage }) => {
    const { form } = inventoryPage;

    await form.fill(bookInput());
    await form.fillField('price', 'twelve pounds');
    await form.save();

    await form.expectFieldError('price', 'Price must be a number');
  });

  test('VAL-009 rejects a price with more than two decimal places', async ({
    inventoryPage,
  }) => {
    const { form } = inventoryPage;

    await form.submit({ ...bookInput(), price: 9.999 });

    await form.expectFieldError('price', 'Price must have at most 2 decimal places');
  });

  test('VAL-010 rejects a price above the maximum', async ({ inventoryPage }) => {
    const { form } = inventoryPage;

    await form.submit({ ...bookInput(), price: LIMITS.price.max + 0.01 });

    await form.expectFieldError('price', `Price must be at most ${LIMITS.price.max}`);
  });

  test('VAL-011 rejects a negative stock level', async ({ inventoryPage }) => {
    const { form } = inventoryPage;

    await form.submit({ ...bookInput(), stock: -1 });

    await form.expectFieldError('stock', `Stock must be at least ${LIMITS.stock.min}`);
  });

  test('VAL-012 rejects a fractional stock level', async ({ inventoryPage }) => {
    const { form } = inventoryPage;

    await form.submit({ ...bookInput(), stock: 1.5 });

    await form.expectFieldError('stock', 'Stock must be a whole number');
  });

  test('VAL-013 rejects a published year before printing existed', async ({
    inventoryPage,
  }) => {
    const { form } = inventoryPage;

    await form.submit({ ...bookInput(), publishedYear: LIMITS.publishedYear.min - 1 });

    await form.expectFieldError(
      'publishedYear',
      `Published year must be at least ${LIMITS.publishedYear.min}`,
    );
  });

  test('VAL-014 rejects a published year in the future', async ({ inventoryPage }) => {
    const { form } = inventoryPage;

    await form.submit({ ...bookInput(), publishedYear: CURRENT_YEAR + 1 });

    await form.expectFieldError(
      'publishedYear',
      `Published year must be at most ${CURRENT_YEAR}`,
    );
  });

  test('VAL-015 rejects a title over the maximum length', async ({ inventoryPage }) => {
    const { form } = inventoryPage;

    await form.submit({ ...bookInput(), title: repeat('a', LIMITS.title.max + 1) });

    await form.expectFieldError(
      'title',
      `Title must be ${LIMITS.title.max} characters or fewer`,
    );
  });

  test('VAL-016 rejects an author over the maximum length', async ({ inventoryPage }) => {
    const { form } = inventoryPage;

    await form.submit({ ...bookInput(), author: repeat('b', LIMITS.author.max + 1) });

    await form.expectFieldError(
      'author',
      `Author must be ${LIMITS.author.max} characters or fewer`,
    );
  });

  test('VAL-017 rejects a description over the maximum length', async ({
    inventoryPage,
  }) => {
    const { form } = inventoryPage;

    await form.submit({
      ...bookInput(),
      description: repeat('c', LIMITS.description.max + 1),
    });

    await form.expectFieldError(
      'description',
      `Description must be ${LIMITS.description.max} characters or fewer`,
    );
  });

  test('VAL-018 clears the error once the field is corrected', async ({
    inventoryPage,
  }) => {
    const { form } = inventoryPage;
    const book = bookInput({ title: 'Corrected Book' });

    await form.fill({ ...book, title: '' });
    await form.save();
    await form.expectFieldError('title', 'Title is required');

    await form.fillField('title', book.title);
    await form.save();

    await form.expectClosed();
    await inventoryPage.expectToast('Book created');
    await inventoryPage.expectRowVisible(book.title);
  });

  test('VAL-019 a rejected submission creates nothing', async ({
    inventoryPage,
    api,
  }) => {
    const { form } = inventoryPage;

    await form.submit({ ...bookInput({ title: 'Never Saved' }), price: -1 });

    await expect(form.root).toBeVisible();
    expect(await api.countBooks()).toBe(SEEDED_BOOK_COUNT);
    expect(await api.findByTitle('Never Saved')).toBeUndefined();
  });

  test('VAL-020 field errors are announced and linked to their input', async ({
    inventoryPage,
  }) => {
    const { form } = inventoryPage;
    await form.save();

    const titleError = form.errorFor('title');
    await expect(titleError).toHaveRole('alert');
    await expect(form.field('title')).toHaveAttribute('aria-describedby', 'e-title');
    await expect(titleError).toHaveAttribute('id', 'e-title');
    await expect(form.field('title')).toHaveAttribute('aria-invalid', 'true');
  });
});
