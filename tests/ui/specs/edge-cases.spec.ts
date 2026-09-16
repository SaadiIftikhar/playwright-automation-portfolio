import { bookInput, repeat } from '../../shared/factories';
import { SEED } from '../../shared/seed-facts';
import { LIMITS, SEEDED_BOOK_COUNT } from '../../shared/types';
import { expect, test } from '../fixtures/test';

test.describe('Edge cases', () => {
  test('EDG-001 accepts every field at its minimum boundary', async ({
    inventoryPage,
    api,
  }) => {
    const book = bookInput({
      title: 'a',
      author: 'b',
      price: LIMITS.price.min,
      stock: LIMITS.stock.min,
      publishedYear: LIMITS.publishedYear.min,
      description: '',
    });

    await inventoryPage.goto();
    await inventoryPage.createBook(book);

    await inventoryPage.expectToast('Book created');
    const saved = await api.findByTitle('a');
    expect(saved).toMatchObject({
      title: 'a',
      author: 'b',
      price: LIMITS.price.min,
      stock: LIMITS.stock.min,
      publishedYear: LIMITS.publishedYear.min,
    });
  });

  test('EDG-002 accepts every field at its maximum boundary', async ({
    inventoryPage,
    api,
  }) => {
    const title = repeat('t', LIMITS.title.max);
    const book = bookInput({
      title,
      author: repeat('a', LIMITS.author.max),
      price: LIMITS.price.max,
      stock: LIMITS.stock.max,
      publishedYear: LIMITS.publishedYear.max,
      description: repeat('d', LIMITS.description.max),
    });

    await inventoryPage.goto();
    await inventoryPage.createBook(book);

    await inventoryPage.expectToast('Book created');
    const saved = await api.findByTitle(title);
    expect(saved).toMatchObject({
      price: LIMITS.price.max,
      stock: LIMITS.stock.max,
      publishedYear: LIMITS.publishedYear.max,
    });
    expect(saved?.title).toHaveLength(LIMITS.title.max);
    expect(saved?.description).toHaveLength(LIMITS.description.max);
  });

  test('EDG-003 rejects each field one past its maximum', async ({ inventoryPage }) => {
    await inventoryPage.goto();
    await inventoryPage.openAddForm();
    const { form } = inventoryPage;

    await form.submit({
      ...bookInput(),
      title: repeat('t', LIMITS.title.max + 1),
      author: repeat('a', LIMITS.author.max + 1),
      price: LIMITS.price.max + 0.01,
      stock: LIMITS.stock.max + 1,
    });

    await form.expectFieldError('title', /120 characters or fewer/);
    await form.expectFieldError('author', /80 characters or fewer/);
    await form.expectFieldError('price', /at most 999.99/);
    await form.expectFieldError('stock', /at most 10000/);
  });

  test('EDG-004 round-trips emoji in the title @core', async ({
    inventoryPage,
    catalogPage,
    api,
  }) => {
    const title = 'Rocket 🚀 Science 🔬 Vol. 1';
    const book = bookInput({ title });

    await inventoryPage.goto();
    await inventoryPage.createBook(book);
    await inventoryPage.expectToast('Book created');
    await inventoryPage.expectRowVisible(title);

    const saved = await api.findByTitle(title);
    expect(saved?.title).toBe(title);

    await catalogPage.goto();
    await catalogPage.search('Rocket 🚀');
    await catalogPage.expectResultCount(1);
    await expect(catalogPage.bookLink(title)).toBeVisible();
  });

  test('EDG-005 round-trips non-Latin and accented characters', async ({
    inventoryPage,
    api,
  }) => {
    const title = '静かな機械 — Máquinas Silenciosas — الآلات الصامتة';
    const author = 'Renée Ångström-Ñuñez';

    await inventoryPage.goto();
    await inventoryPage.createBook(bookInput({ title, author }));

    await inventoryPage.expectToast('Book created');
    await inventoryPage.expectRowVisible(title);
    const saved = await api.findByTitle(title);
    expect(saved).toMatchObject({ title, author });
  });

  test('EDG-006 renders markup in a field as literal text @core', async ({
    inventoryPage,
    catalogPage,
  }) => {
    const title = '<script>alert("xss")</script> & <b>bold</b>';

    await inventoryPage.goto();
    await inventoryPage.createBook(bookInput({ title }));
    await inventoryPage.expectToast('Book created');

    await expect(
      inventoryPage.page.getByRole('cell', { name: title, exact: true }),
    ).toBeVisible();
    await expect(inventoryPage.page.locator('script#injected')).toHaveCount(0);
    await expect(inventoryPage.page.locator('table b')).toHaveCount(0);

    await catalogPage.goto();
    await catalogPage.search('<script>');
    await catalogPage.expectResultCount(1);
    await expect(catalogPage.bookLink(title)).toBeVisible();
  });

  test('EDG-007 trims surrounding whitespace before saving', async ({
    inventoryPage,
    api,
  }) => {
    await inventoryPage.goto();
    await inventoryPage.createBook(
      bookInput({ title: '   Padded Title   ', author: '  Padded Author  ' }),
    );

    await inventoryPage.expectToast('Book created');
    const saved = await api.findByTitle('Padded Title');
    expect(saved).toMatchObject({ title: 'Padded Title', author: 'Padded Author' });
  });

  test('EDG-008 accepts a hyphenated ISBN and stores it normalised', async ({
    inventoryPage,
    api,
  }) => {
    const title = 'Hyphenated ISBN Book';

    await inventoryPage.goto();
    await inventoryPage.createBook(bookInput({ title, isbn: '978-0-596-52068-7' }));

    await inventoryPage.expectToast('Book created');
    const saved = await api.findByTitle(title);
    expect(saved?.isbn).toBe('9780596520687');
  });

  test('EDG-009 shows the empty state when nothing matches @core', async ({
    catalogPage,
  }) => {
    await catalogPage.goto();
    await catalogPage.search('nothing-here-matches-this-query');

    await catalogPage.expectEmptyState();
    await expect(catalogPage.errorMessage).toBeHidden();
  });

  test('EDG-010 treats regex metacharacters in search as literal text', async ({
    catalogPage,
  }) => {
    await catalogPage.goto();
    await catalogPage.search('.*');

    await catalogPage.expectEmptyState();

    await catalogPage.search('(a+)+$');
    await catalogPage.expectEmptyState();
  });

  test('EDG-011 a search matching everything returns the whole catalog', async ({
    catalogPage,
  }) => {
    await catalogPage.goto();
    await catalogPage.search('e');

    await expect(catalogPage.bookCards.first()).toBeVisible();
    const count = Number((await catalogPage.resultCount.innerText()).split(' ')[0]);
    expect(count).toBeGreaterThan(0);
    await expect(catalogPage.bookCards).toHaveCount(count);
  });

  test('EDG-012 an empty catalog shows the empty state on both pages', async ({
    api,
    catalogPage,
    inventoryPage,
  }) => {
    await api.clearCatalog();

    await catalogPage.goto();
    await catalogPage.expectEmptyState();

    await inventoryPage.goto();
    await inventoryPage.expectEmptyState();
  });

  test('EDG-013 deleting the final book leaves an empty inventory', async ({
    api,
    inventoryPage,
  }) => {
    await api.clearCatalog();
    const only = bookInput({ title: 'The Last Book' });
    await api.createBook(only);

    await inventoryPage.goto();
    await inventoryPage.expectRowCount(1);
    await inventoryPage.deleteBook(only.title);

    await inventoryPage.expectToast(`Deleted "${only.title}"`);
    await inventoryPage.expectEmptyState();
  });

  test('EDG-014 a double-clicked save creates exactly one book', async ({
    inventoryPage,
    api,
  }) => {
    const book = bookInput({ title: 'Single Creation Only' });

    await inventoryPage.goto();
    await inventoryPage.openAddForm();
    await inventoryPage.form.fill(book);

    await inventoryPage.form.saveButton.dblclick();

    await inventoryPage.expectToast('Book created');
    await inventoryPage.expectRowCount(SEEDED_BOOK_COUNT + 1);
    const { data } = await api.listBooks({ search: book.title, limit: 100 });
    expect(data).toHaveLength(1);
  });

  test('EDG-015 a double-clicked delete removes the book once without error', async ({
    inventoryPage,
    api,
  }) => {
    const book = bookInput({ title: 'Delete Me Once' });
    await api.createBook(book);

    await inventoryPage.goto();
    await inventoryPage.deleteButton(book.title).click();
    await inventoryPage.confirmDialog.expectOpen(book.title);
    await inventoryPage.confirmDialog.confirmButton.dblclick();

    await inventoryPage.expectToast(`Deleted "${book.title}"`);
    await expect(inventoryPage.errorMessage).toBeHidden();
    await inventoryPage.expectRowCount(SEEDED_BOOK_COUNT);
  });

  test('EDG-016 a book with no description falls back to placeholder text', async ({
    api,
    bookDetailPage,
  }) => {
    const book = await api.createBook(bookInput({ title: 'No Blurb', description: '' }));

    await bookDetailPage.goto(book.id);

    await bookDetailPage.expectLoaded('No Blurb');
    await expect(bookDetailPage.description).toHaveText('No description provided.');
  });

  test('EDG-017 an unknown book id shows the not-found view @core', async ({
    bookDetailPage,
  }) => {
    await bookDetailPage.goto('bk_does_not_exist');

    await bookDetailPage.expectNotFound();
    await expect(bookDetailPage.backLink).toBeVisible();
  });

  test('EDG-018 a missing id parameter shows the not-found view', async ({
    bookDetailPage,
  }) => {
    await bookDetailPage.page.goto('/book.html');

    await bookDetailPage.expectNotFound();
  });

  test('EDG-019 filtering to a genre with no in-stock books shows the empty state', async ({
    api,
    catalogPage,
  }) => {
    await api.clearCatalog();
    await api.createBook(
      bookInput({ title: 'Sold Out Poem', genre: 'poetry', stock: 0 }),
    );

    await catalogPage.goto();
    await catalogPage.filterByGenre('poetry');
    await catalogPage.expectResultCount(1);

    await catalogPage.onlyInStock();

    await catalogPage.expectEmptyState();
  });

  test('EDG-020 an out-of-stock seeded book cannot be bought but is still listed', async ({
    catalogPage,
  }) => {
    await catalogPage.goto();

    await expect(catalogPage.card(SEED.outOfStock.title)).toContainText('Out of stock');
    await catalogPage.onlyInStock();
    await expect(catalogPage.card(SEED.outOfStock.title)).toHaveCount(0);
  });
});
