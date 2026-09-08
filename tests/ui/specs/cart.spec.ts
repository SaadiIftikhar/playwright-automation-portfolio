import { SEED } from '../../shared/seed-facts';
import { expect, test } from '../fixtures/test';

test.describe('Cart', () => {
  test('CRT-001 adds a book to the cart from the detail page @core', async ({
    api,
    bookDetailPage,
    cartPage,
  }) => {
    const book = await api.findByTitle(SEED.sample.title);

    await bookDetailPage.goto(book!.id);
    await bookDetailPage.addToCartAndWait();
    await bookDetailPage.nav.expectCartCount(1);

    await cartPage.goto();
    await cartPage.expectItem(SEED.sample.title, 1, SEED.sample.price);
    await cartPage.expectSubtotal(SEED.sample.price);
  });

  test('CRT-002 adding the same book twice increments the quantity @core', async ({
    api,
    bookDetailPage,
    cartPage,
  }) => {
    const book = await api.findByTitle(SEED.sample.title);

    await bookDetailPage.goto(book!.id);
    await bookDetailPage.addToCartAndWait();
    await bookDetailPage.addToCartAndWait();
    await bookDetailPage.nav.expectCartCount(2);

    await cartPage.goto();
    await expect(cartPage.rows).toHaveCount(1);
    await cartPage.expectItem(SEED.sample.title, 2, '$45.00');
    await cartPage.expectSubtotal('$45.00');
  });

  test('CRT-003 adds several copies in one go', async ({
    api,
    bookDetailPage,
    cartPage,
  }) => {
    const book = await api.findByTitle(SEED.sample.title);

    await bookDetailPage.goto(book!.id);
    await bookDetailPage.setQuantity(3);
    await bookDetailPage.addToCartAndWait();

    await cartPage.goto();
    await cartPage.expectItem(SEED.sample.title, 3, '$67.50');
  });

  test('CRT-004 refuses to add more copies than are in stock', async ({
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
    await bookDetailPage.nav.expectCartCount(0);
  });

  test('CRT-005 cannot add an out-of-stock book', async ({ api, bookDetailPage }) => {
    const book = await api.findByTitle(SEED.outOfStock.title);

    await bookDetailPage.goto(book!.id);
    await bookDetailPage.expectLoaded(SEED.outOfStock.title);

    await expect(bookDetailPage.page.getByRole('button', { name: 'Out of stock' })).toBeDisabled();
  });

  test('CRT-006 removing an item updates the totals', async ({ api, cartPage }) => {
    const first = await api.findByTitle(SEED.sample.title);
    const second = await api.findByTitle(SEED.secondSample.title);
    await api.addToCart(first!.id, 1);
    await api.addToCart(second!.id, 1);

    await cartPage.goto();
    await expect(cartPage.rows).toHaveCount(2);

    await cartPage.removeItem(SEED.sample.title);

    await expect(cartPage.rows).toHaveCount(1);
    await expect(cartPage.row(SEED.sample.title)).toHaveCount(0);
    await cartPage.expectSubtotal(SEED.secondSample.price);
    await cartPage.nav.expectCartCount(1);
  });

  test('CRT-007 clearing the cart shows the empty state @core', async ({ api, cartPage }) => {
    const book = await api.findByTitle(SEED.sample.title);
    await api.addToCart(book!.id, 2);

    await cartPage.goto();
    await expect(cartPage.rows).toHaveCount(1);

    await cartPage.clearCart();

    await cartPage.expectEmpty();
    await cartPage.nav.expectCartCount(0);
  });

  test('CRT-008 an untouched cart starts empty', async ({ cartPage }) => {
    await cartPage.goto();

    await cartPage.expectEmpty();
    await cartPage.nav.expectCartCount(0);
  });

  test('CRT-009 the cart count survives navigation between pages', async ({
    api,
    catalogPage,
    cartPage,
  }) => {
    const book = await api.findByTitle(SEED.sample.title);
    await api.addToCart(book!.id, 2);

    await catalogPage.goto();
    await catalogPage.nav.expectCartCount(2);

    await catalogPage.nav.openInventory();
    await catalogPage.nav.expectCartCount(2);

    await catalogPage.nav.openCart();
    await cartPage.nav.expectCartCount(2);
  });

  test('CRT-010 deleting a book removes it from the cart', async ({
    api,
    cartPage,
    inventoryPage,
  }) => {
    const book = await api.findByTitle(SEED.sample.title);
    await api.addToCart(book!.id, 1);

    await inventoryPage.goto();
    await inventoryPage.deleteBook(SEED.sample.title);
    await inventoryPage.expectToast(`Deleted "${SEED.sample.title}"`);

    await cartPage.goto();
    await cartPage.expectEmpty();
  });
});
