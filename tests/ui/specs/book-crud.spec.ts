import { bookInput } from '../../shared/factories';
import { SEEDED_BOOK_COUNT } from '../../shared/types';
import { expect, test } from '../fixtures/test';

test.describe('Book CRUD', () => {
  test('BK-001 creates a book from the inventory form @core', async ({
    inventoryPage,
    api,
  }) => {
    const book = bookInput({ title: 'Inventory Created Book' });

    await inventoryPage.goto();
    await inventoryPage.expectRowCount(SEEDED_BOOK_COUNT);
    await inventoryPage.createBook(book);

    await inventoryPage.expectToast('Book created');
    await inventoryPage.expectRowVisible(book.title);
    await inventoryPage.expectRowCount(SEEDED_BOOK_COUNT + 1);

    const persisted = await api.findByTitle(book.title);
    expect(persisted).toMatchObject({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      price: book.price,
      stock: book.stock,
      genre: book.genre,
    });
  });

  test('BK-002 a newly created book appears in the public catalog @core', async ({
    inventoryPage,
    catalogPage,
  }) => {
    const book = bookInput({ title: 'Catalog Visible Book' });

    await inventoryPage.goto();
    await inventoryPage.createBook(book);
    await inventoryPage.expectToast('Book created');

    await catalogPage.goto();
    await catalogPage.search(book.title);
    await catalogPage.expectResultCount(1);
    await expect(catalogPage.bookLink(book.title)).toBeVisible();
  });

  test('BK-003 completes the full create, view, update, delete lifecycle @core', async ({
    inventoryPage,
    catalogPage,
    bookDetailPage,
    api,
  }) => {
    const book = bookInput({ title: 'Lifecycle Book', price: 25.0, stock: 8 });

    await inventoryPage.goto();
    await inventoryPage.createBook(book);
    await inventoryPage.expectToast('Book created');

    const created = await api.findByTitle(book.title);
    expect(created).toBeDefined();

    await bookDetailPage.goto(created!.id);
    await bookDetailPage.expectLoaded(book.title);
    await expect(bookDetailPage.price).toHaveText('$25.00');
    await expect(bookDetailPage.stockBadge).toHaveText('8 in stock');

    await inventoryPage.goto();
    await inventoryPage.openEditForm(book.title);
    await inventoryPage.form.fillField('price', '31.50');
    await inventoryPage.form.fillField('stock', '2');
    await inventoryPage.form.save();
    await inventoryPage.expectToast('Book updated');

    await bookDetailPage.goto(created!.id);
    await expect(bookDetailPage.price).toHaveText('$31.50');
    await expect(bookDetailPage.stockBadge).toHaveText('2 in stock');

    await inventoryPage.goto();
    await inventoryPage.deleteBook(book.title);
    await inventoryPage.expectToast(`Deleted "${book.title}"`);
    await inventoryPage.expectRowAbsent(book.title);

    await catalogPage.goto();
    await catalogPage.search(book.title);
    await catalogPage.expectEmptyState();
  });

  test('BK-004 the edit form is pre-populated with the current values', async ({
    inventoryPage,
    api,
  }) => {
    const book = bookInput({
      title: 'Prefilled Book',
      price: 42.5,
      stock: 11,
      genre: 'poetry',
      publishedYear: 1999,
      description: 'Existing description',
    });
    await api.createBook(book);

    await inventoryPage.goto();
    await inventoryPage.openEditForm(book.title);

    await inventoryPage.form.expectValues({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      price: 42.5,
      stock: 11,
      genre: 'poetry',
      publishedYear: 1999,
      description: 'Existing description',
    });
  });

  test('BK-005 deleting a book asks for confirmation and removes the row @core', async ({
    inventoryPage,
    api,
  }) => {
    const book = bookInput({ title: 'Doomed Book' });
    await api.createBook(book);

    await inventoryPage.goto();
    await inventoryPage.expectRowCount(SEEDED_BOOK_COUNT + 1);
    await inventoryPage.deleteBook(book.title);

    await inventoryPage.expectToast(`Deleted "${book.title}"`);
    await inventoryPage.expectRowAbsent(book.title);
    await inventoryPage.expectRowCount(SEEDED_BOOK_COUNT);
    expect(await api.findByTitle(book.title)).toBeUndefined();
  });

  test('BK-006 cancelling the delete confirmation keeps the book', async ({
    inventoryPage,
    api,
  }) => {
    const book = bookInput({ title: 'Spared Book' });
    await api.createBook(book);

    await inventoryPage.goto();
    await inventoryPage.deleteBook(book.title, { confirm: false });

    await expect(inventoryPage.confirmDialog.root).toBeHidden();
    await inventoryPage.expectRowVisible(book.title);
    await inventoryPage.expectRowCount(SEEDED_BOOK_COUNT + 1);
    expect(await api.findByTitle(book.title)).toBeDefined();
  });
});
