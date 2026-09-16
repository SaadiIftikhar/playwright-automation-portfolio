import { SEED } from '../../shared/seed-facts';
import { expect, test } from '../fixtures/test';

test.describe('Catalog browsing', () => {
  test.beforeEach(async ({ catalogPage }) => {
    await catalogPage.goto();
  });

  test('CAT-001 lists the full catalog with title, author and price @core', async ({
    catalogPage,
  }) => {
    await catalogPage.expectResultCount(SEED.totalBooks);

    const card = catalogPage.card(SEED.sample.title);
    await expect(card).toContainText(`by ${SEED.sample.author}`);
    await expect(card).toContainText(SEED.sample.genre);
    await expect(card).toContainText(SEED.sample.price);
    await expect(card).toContainText(`${SEED.sample.stock} in stock`);
  });

  test('CAT-002 marks out-of-stock books', async ({ catalogPage }) => {
    await expect(catalogPage.card(SEED.outOfStock.title)).toContainText('Out of stock');
  });

  test('CAT-003 searches by title @core', async ({ catalogPage }) => {
    await catalogPage.search(SEED.sample.title);

    await catalogPage.expectResultCount(1);
    await expect(catalogPage.bookLink(SEED.sample.title)).toBeVisible();
  });

  test('CAT-004 searches by author', async ({ catalogPage }) => {
    await catalogPage.search(SEED.authorWithTwoBooks.name);

    await catalogPage.expectResultCount(SEED.authorWithTwoBooks.count);
    for (const title of await catalogPage.titles()) {
      await expect(catalogPage.card(title)).toContainText(SEED.authorWithTwoBooks.name);
    }
  });

  test('CAT-005 search is case-insensitive', async ({ catalogPage }) => {
    await catalogPage.search(SEED.authorWithTwoBooks.name.toUpperCase());
    await catalogPage.expectResultCount(SEED.authorWithTwoBooks.count);

    await catalogPage.search(SEED.authorWithTwoBooks.name.toLowerCase());
    await catalogPage.expectResultCount(SEED.authorWithTwoBooks.count);
  });

  test('CAT-006 filters by genre @core', async ({ catalogPage }) => {
    await catalogPage.filterByGenre('poetry');

    await catalogPage.expectResultCount(SEED.genreCounts.poetry);
    for (const title of await catalogPage.titles()) {
      await expect(catalogPage.card(title)).toContainText('poetry');
    }
  });

  test('CAT-007 hides out-of-stock books when the stock filter is on', async ({
    catalogPage,
  }) => {
    await catalogPage.onlyInStock();

    await catalogPage.expectResultCount(SEED.inStockBooks);
    await expect(catalogPage.card(SEED.outOfStock.title)).toHaveCount(0);
  });

  test('CAT-008 sorts by price ascending and descending', async ({ catalogPage }) => {
    await catalogPage.sortBy('price');
    await expect(catalogPage.bookCards.first()).toContainText(SEED.cheapest.formatted);
    expect(await catalogPage.prices()).toEqual(
      [...(await catalogPage.prices())].sort((a, b) => a - b),
    );

    await catalogPage.sortBy('-price');
    await expect(catalogPage.bookCards.first()).toContainText(
      SEED.mostExpensive.formatted,
    );
    expect(await catalogPage.prices()).toEqual(
      [...(await catalogPage.prices())].sort((a, b) => b - a),
    );
  });

  test('CAT-009 sorts by title in both directions', async ({ catalogPage }) => {
    await catalogPage.sortBy('title');
    await expect(catalogPage.bookCards.first()).toContainText(SEED.firstByTitleAsc);

    await catalogPage.sortBy('-title');
    await expect(catalogPage.bookCards.first()).toContainText(SEED.firstByTitleDesc);
  });

  test('CAT-010 composes search, genre and stock filters @core', async ({
    catalogPage,
  }) => {
    await catalogPage.search(SEED.narrowing.author);
    await catalogPage.expectResultCount(SEED.narrowing.authorCount);

    await catalogPage.filterByGenre(SEED.narrowing.genre);
    await catalogPage.expectResultCount(SEED.narrowing.genreCount);

    await catalogPage.onlyInStock();
    await catalogPage.expectResultCount(SEED.narrowing.inStockCount);
    await expect(catalogPage.bookLink(SEED.narrowing.inStockTitle)).toBeVisible();
  });

  test('CAT-011 clear filters restores the full catalog @core', async ({
    catalogPage,
  }) => {
    await catalogPage.search(SEED.narrowing.author);
    await catalogPage.filterByGenre(SEED.narrowing.genre);
    await catalogPage.onlyInStock();
    await catalogPage.expectResultCount(SEED.narrowing.inStockCount);

    await catalogPage.clearFilters();

    await catalogPage.expectResultCount(SEED.totalBooks);
    await expect(catalogPage.searchBox).toHaveValue('');
    await expect(catalogPage.genreFilter).toHaveValue('');
    await expect(catalogPage.inStockCheckbox).not.toBeChecked();
  });

  test('CAT-012 the result count agrees with the rendered cards', async ({
    catalogPage,
  }) => {
    await catalogPage.filterByGenre('fiction');

    await expect(catalogPage.resultCount).toHaveText(`${SEED.genreCounts.fiction} books`);
    await expect(catalogPage.bookCards).toHaveCount(SEED.genreCounts.fiction);
  });

  test('CAT-013 a single result is described in the singular', async ({
    catalogPage,
  }) => {
    await catalogPage.filterByGenre('biography');

    await expect(catalogPage.resultCount).toHaveText('1 book');
  });

  test('CAT-014 opens the detail page for a book @core', async ({
    catalogPage,
    bookDetailPage,
  }) => {
    await catalogPage.openBook(SEED.sample.title);

    await bookDetailPage.expectLoaded(SEED.sample.title);
    await expect(bookDetailPage.price).toHaveText(SEED.sample.price);
    await expect(catalogPage.page).toHaveURL(/\/book\.html\?id=bk_\d+/);
  });
});
