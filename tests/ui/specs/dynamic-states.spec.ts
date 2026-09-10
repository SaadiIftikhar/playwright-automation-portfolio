import { bookInput } from '../../shared/factories';
import {
  countRequests,
  holdRequests,
  isBookCreate,
  isBookList,
  isCartAdd,
} from '../../shared/network';
import { SEED } from '../../shared/seed-facts';
import { expect, test } from '../fixtures/test';

test.describe('Dynamic UI states', () => {
  test('DYN-001 shows the loading indicator while the catalog is in flight @core', async ({
    page,
    catalogPage,
  }) => {
    const gate = await holdRequests(page, isBookList);

    await page.goto('/index.html');
    await gate.waitUntilHeld();

    await expect(catalogPage.loadingIndicator).toBeVisible();
    await expect(catalogPage.loadingIndicator).toHaveText(/Loading books/);
    await expect(catalogPage.bookCards).toHaveCount(0);

    gate.release();

    await expect(catalogPage.loadingIndicator).toBeHidden();
    await catalogPage.expectResultCount(SEED.totalBooks);
    await gate.dispose();
  });

  test('DYN-002 debounces typing into one request', async ({ page, catalogPage }) => {
    await catalogPage.goto();
    await catalogPage.expectResultCount(SEED.totalBooks);

    const countSearches = countRequests(page, '/api/books');
    const term = SEED.authorWithTwoBooks.name;

    await catalogPage.searchBox.pressSequentially(term);

    await catalogPage.expectResultCount(SEED.authorWithTwoBooks.count);
    expect(
      countSearches(),
      `typing ${term.length} characters should issue one request, not one per keystroke`,
    ).toBe(1);
  });

  test('DYN-003 a slow earlier search cannot overwrite a newer one', async ({
    page,
    catalogPage,
  }) => {
    await catalogPage.goto();
    await catalogPage.expectResultCount(SEED.totalBooks);

    // Park only the first search; the follow-up goes straight through.
    const slowTerm = SEED.authorWithTwoBooks.name;
    const fastTerm = SEED.secondSample.title;
    const gate = await holdRequests(page, (route) => {
      if (!isBookList(route)) return false;
      return new URL(route.request().url()).searchParams.get('search') === slowTerm;
    });

    await catalogPage.search(slowTerm);
    await gate.waitUntilHeld();

    await catalogPage.search(fastTerm);
    await catalogPage.expectResultCount(1);
    await expect(catalogPage.bookLink(fastTerm)).toBeVisible();

    const staleResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).searchParams.get('search') === slowTerm,
    );
    gate.release();
    await staleResponse;

    // The stale payload arrived last but must not repaint the list.
    await catalogPage.expectResultCount(1);
    await expect(catalogPage.bookLink(fastTerm)).toBeVisible();
    await gate.dispose();
  });

  test('DYN-004 the add-to-cart button reports progress and locks while in flight @core', async ({
    page,
    api,
    bookDetailPage,
  }) => {
    const book = await api.findByTitle(SEED.sample.title);
    await bookDetailPage.goto(book!.id);
    await bookDetailPage.expectLoaded(SEED.sample.title);

    const gate = await holdRequests(page, isCartAdd);
    await bookDetailPage.addToCart();
    await gate.waitUntilHeld();

    await expect(bookDetailPage.busyButton).toBeVisible();
    await expect(bookDetailPage.busyButton).toBeDisabled();
    await expect(bookDetailPage.successMessage).toBeHidden();

    gate.release();

    await expect(bookDetailPage.successMessage).toBeVisible();
    await expect(bookDetailPage.addToCartButton).toBeEnabled();
    await bookDetailPage.nav.expectCartCount(1);
    await gate.dispose();
  });

  test('DYN-005 double-clicking add to cart sends a single request @core', async ({
    page,
    api,
    bookDetailPage,
    cartPage,
  }) => {
    const book = await api.findByTitle(SEED.sample.title);
    await bookDetailPage.goto(book!.id);
    await bookDetailPage.expectLoaded(SEED.sample.title);

    const countAdds = countRequests(page, '/api/cart/items', 'POST');
    await bookDetailPage.addToCartButton.dblclick();

    await expect(bookDetailPage.successMessage).toBeVisible();
    await bookDetailPage.nav.expectCartCount(1);
    expect(countAdds()).toBe(1);

    await cartPage.goto();
    await cartPage.expectItem(SEED.sample.title, 1, SEED.sample.price);
  });

  test('DYN-006 the save button reports progress and locks while saving', async ({
    page,
    inventoryPage,
  }) => {
    await inventoryPage.goto();
    await inventoryPage.openAddForm();
    await inventoryPage.form.fill(bookInput({ title: 'Slow Save Book' }));

    const gate = await holdRequests(page, isBookCreate);
    await inventoryPage.form.save();
    await gate.waitUntilHeld();

    await expect(inventoryPage.form.savingButton).toBeVisible();
    await expect(inventoryPage.form.savingButton).toBeDisabled();

    gate.release();

    await inventoryPage.form.expectClosed();
    await inventoryPage.expectToast('Book created');
    await gate.dispose();
  });

  test('DYN-007 a repeated save while one is in flight creates a single book', async ({
    page,
    inventoryPage,
    api,
  }) => {
    const book = bookInput({ title: 'Only Once Please' });

    await inventoryPage.goto();
    await inventoryPage.openAddForm();
    await inventoryPage.form.fill(book);

    const countCreates = countRequests(page, '/api/books', 'POST');
    const gate = await holdRequests(page, isBookCreate);

    await inventoryPage.form.save();
    await gate.waitUntilHeld();
    await inventoryPage.form.submitButton.click({ force: true });
    await inventoryPage.form.submitButton.click({ force: true });

    gate.release();
    await inventoryPage.expectToast('Book created');

    expect(countCreates()).toBe(1);
    const { data } = await api.listBooks({ search: book.title, limit: 100 });
    expect(data).toHaveLength(1);
    await gate.dispose();
  });

  test('DYN-008 a failing catalog request shows an error with a working retry @core', async ({
    page,
    catalogPage,
  }) => {
    let failNext = true;
    await page.route(
      (url) => url.pathname === '/api/books',
      async (route) => {
        if (failNext) {
          failNext = false;
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error', details: [] },
            }),
          });
          return;
        }
        await route.continue();
      },
    );

    await catalogPage.goto();

    await expect(catalogPage.errorMessage).toBeVisible();
    await expect(catalogPage.errorMessage).toContainText('Could not load books');
    await expect(catalogPage.bookCards).toHaveCount(0);

    const retry = page.getByRole('button', { name: 'Try again' });
    await expect(retry).toBeVisible();
    await retry.click();

    await expect(catalogPage.errorMessage).toBeHidden();
    await catalogPage.expectResultCount(SEED.totalBooks);
  });

  test('DYN-009 the inventory table shows a loading state before it renders', async ({
    page,
    inventoryPage,
  }) => {
    const gate = await holdRequests(page, isBookList);

    await page.goto('/admin.html');
    await gate.waitUntilHeld();

    await expect(inventoryPage.loadingIndicator).toBeVisible();

    gate.release();

    await inventoryPage.expectRowCount(SEED.totalBooks);
    await expect(inventoryPage.loadingIndicator).toBeHidden();
    await gate.dispose();
  });

  test('DYN-010 clearing the search box restores the full catalog', async ({
    catalogPage,
  }) => {
    await catalogPage.goto();
    await catalogPage.search(SEED.sample.title);
    await catalogPage.expectResultCount(1);

    await catalogPage.search('');

    await catalogPage.expectResultCount(SEED.totalBooks);
    await expect(catalogPage.emptyStateMessage).toBeHidden();
  });

  test('DYN-011 rapid filter switching settles on the last selection', async ({
    catalogPage,
  }) => {
    await catalogPage.goto();
    await catalogPage.expectResultCount(SEED.totalBooks);

    await catalogPage.filterByGenre('fiction');
    await catalogPage.filterByGenre('poetry');
    await catalogPage.filterByGenre('biography');

    await catalogPage.expectResultCount(SEED.genreCounts.biography);
    await expect(catalogPage.genreFilter).toHaveValue('biography');
  });
});
