import { bookInput } from '../../shared/factories';
import { SEED } from '../../shared/seed-facts';
import { expect, test } from '../fixtures/test';

/**
 * Regression cover for defects found while building the suite. Each test names
 * the bug it locks down; see docs/BUG-REPORTS.md for the full write-ups.
 */
test.describe('Regressions', () => {
  test('REG-001 (BUG-003) the catalog never claims more books than it shows', async ({
    api,
    catalogPage,
  }) => {
    await api.clearCatalog();
    for (let index = 1; index <= 25; index += 1) {
      await api.createBook(
        bookInput({ title: `Paged Book ${String(index).padStart(2, '0')}` }),
      );
    }

    await catalogPage.goto();

    await catalogPage.expectShowingOf(20, 25);
    await expect(catalogPage.showMoreButton).toBeVisible();
  });

  test('REG-002 (BUG-003) show more reveals the rest of the catalog', async ({
    api,
    catalogPage,
  }) => {
    await api.clearCatalog();
    for (let index = 1; index <= 25; index += 1) {
      await api.createBook(
        bookInput({ title: `Paged Book ${String(index).padStart(2, '0')}` }),
      );
    }

    await catalogPage.goto();
    await catalogPage.expectShowingOf(20, 25);

    await catalogPage.showMore();

    await catalogPage.expectResultCount(25);
    await expect(catalogPage.showMoreButton).toBeHidden();
  });

  test('REG-003 (BUG-003) changing a filter goes back to the first page', async ({
    api,
    catalogPage,
  }) => {
    await api.clearCatalog();
    for (let index = 1; index <= 25; index += 1) {
      await api.createBook(
        bookInput({ title: `Paged Book ${String(index).padStart(2, '0')}` }),
      );
    }

    await catalogPage.goto();
    await catalogPage.showMore();
    await catalogPage.expectResultCount(25);

    await catalogPage.search('Paged Book 01');

    await catalogPage.expectResultCount(1);
    await expect(catalogPage.showMoreButton).toBeHidden();
  });

  test('REG-004 (BUG-003) a catalog that fits on one page shows no paging control', async ({
    catalogPage,
  }) => {
    await catalogPage.goto();

    await catalogPage.expectResultCount(SEED.totalBooks);
    await expect(catalogPage.showMoreButton).toBeHidden();
  });

  test('REG-005 (BUG-004) a quantity of zero is rejected instead of silently becoming one', async ({
    api,
    bookDetailPage,
  }) => {
    const book = await api.findByTitle(SEED.sample.title);

    await bookDetailPage.goto(book!.id);
    await bookDetailPage.setQuantity(0);
    await bookDetailPage.addToCart();

    await bookDetailPage.expectQuantityRejected(
      'Quantity must be a whole number of 1 or more',
    );
    await expect(bookDetailPage.successMessage).toBeHidden();
    await bookDetailPage.nav.expectCartCount(0);
    expect((await api.getCart()).itemCount).toBe(0);
  });

  test('REG-006 (BUG-004) a negative quantity is rejected', async ({
    api,
    bookDetailPage,
  }) => {
    const book = await api.findByTitle(SEED.sample.title);

    await bookDetailPage.goto(book!.id);
    await bookDetailPage.setQuantity(-3);
    await bookDetailPage.addToCart();

    await bookDetailPage.expectQuantityRejected(/whole number of 1 or more/);
    expect((await api.getCart()).itemCount).toBe(0);
  });

  test('REG-007 (BUG-004) correcting the quantity clears the error and adds to cart', async ({
    api,
    bookDetailPage,
  }) => {
    const book = await api.findByTitle(SEED.sample.title);

    await bookDetailPage.goto(book!.id);
    await bookDetailPage.setQuantity(0);
    await bookDetailPage.addToCart();
    await bookDetailPage.expectQuantityRejected(/whole number of 1 or more/);

    await bookDetailPage.setQuantity(2);
    await bookDetailPage.addToCartAndWait();

    await expect(bookDetailPage.errorMessage).toBeHidden();
    await bookDetailPage.nav.expectCartCount(2);
  });

  test('REG-008 (BUG-002) the inventory toast only appears once the table is current', async ({
    inventoryPage,
  }) => {
    const book = bookInput({ title: 'Toast Ordering Book' });

    await inventoryPage.goto();
    await inventoryPage.createBook(book);

    // The toast is the signal the suite waits on, so it must never arrive
    // before the row it is announcing.
    await inventoryPage.expectToast('Book created');
    await expect(inventoryPage.row(book.title)).toBeVisible();
  });

  test('REG-009 (BUG-001) the server stock limit reaches the user', async ({
    api,
    bookDetailPage,
  }) => {
    const book = await api.findByTitle(SEED.sample.title);

    await bookDetailPage.goto(book!.id);
    await bookDetailPage.setQuantity(SEED.sample.stock + 1);
    await bookDetailPage.addToCart();

    await expect(bookDetailPage.errorMessage).toBeVisible();
    await expect(bookDetailPage.errorMessage).toContainText(
      `Only ${SEED.sample.stock} copies`,
    );
  });
});
