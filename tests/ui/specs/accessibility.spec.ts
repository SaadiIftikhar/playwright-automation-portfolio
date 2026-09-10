import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { uniqueIsbn } from '../../shared/factories';
import { SEED } from '../../shared/seed-facts';
import { SEEDED_BOOK_COUNT } from '../../shared/types';
import { expect, test } from '../fixtures/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const scan = (page: Page) => new AxeBuilder({ page }).withTags(WCAG_TAGS);

test.describe('Accessibility', () => {
  test('A11Y-001 the catalog has no WCAG A or AA violations @core', async ({
    page,
    catalogPage,
  }) => {
    await catalogPage.goto();
    await catalogPage.expectResultCount(SEED.totalBooks);

    const { violations } = await scan(page).analyze();

    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  test('A11Y-002 the book detail page has no WCAG A or AA violations', async ({
    page,
    api,
    bookDetailPage,
  }) => {
    const book = await api.findByTitle(SEED.sample.title);
    await bookDetailPage.goto(book!.id);
    await bookDetailPage.expectLoaded(SEED.sample.title);

    const { violations } = await scan(page).analyze();

    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  test('A11Y-003 the inventory page has no WCAG A or AA violations', async ({
    page,
    inventoryPage,
  }) => {
    await inventoryPage.goto();
    await inventoryPage.expectRowCount(SEEDED_BOOK_COUNT);

    const { violations } = await scan(page).analyze();

    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  test('A11Y-004 the open book dialog has no WCAG A or AA violations', async ({
    page,
    inventoryPage,
  }) => {
    await inventoryPage.goto();
    await inventoryPage.openAddForm();

    const { violations } = await scan(page).analyze();

    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  test('A11Y-005 the empty catalog state has no WCAG A or AA violations', async ({
    page,
    catalogPage,
  }) => {
    await catalogPage.goto();
    await catalogPage.search('no-such-book-anywhere');
    await catalogPage.expectEmptyState();

    const { violations } = await scan(page).analyze();

    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  test('A11Y-006 every catalog control is reachable by its label', async ({
    catalogPage,
  }) => {
    await catalogPage.goto();

    await expect(catalogPage.searchBox).toBeVisible();
    await expect(catalogPage.genreFilter).toBeVisible();
    await expect(catalogPage.sortSelect).toBeVisible();
    await expect(catalogPage.inStockCheckbox).toBeVisible();
    await expect(catalogPage.clearFiltersButton).toBeVisible();
  });

  test('A11Y-007 the page exposes the expected landmarks and heading level @core', async ({
    page,
    catalogPage,
  }) => {
    await catalogPage.goto();

    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('search', { name: 'Book filters' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(catalogPage.results).toHaveAccessibleName('Book results');
  });

  test('A11Y-008 a book can be created using only the keyboard @core', async ({
    page,
    inventoryPage,
    api,
  }) => {
    const title = 'Keyboard Only Book';
    await inventoryPage.goto();

    await inventoryPage.addBookButton.focus();
    await page.keyboard.press('Enter');
    await inventoryPage.form.expectOpen('Add book');

    // Focus lands on the first field when the dialog opens, so the rest of the
    // form is reachable by tabbing alone.
    await expect(inventoryPage.form.field('title')).toBeFocused();
    await page.keyboard.type(title);

    await page.keyboard.press('Tab');
    await expect(inventoryPage.form.field('author')).toBeFocused();
    await page.keyboard.type('Keyboard Author');

    await page.keyboard.press('Tab');
    await expect(inventoryPage.form.field('isbn')).toBeFocused();
    await page.keyboard.type(uniqueIsbn());

    await page.keyboard.press('Tab');
    await expect(inventoryPage.form.field('price')).toBeFocused();
    await page.keyboard.type('15.00');

    await page.keyboard.press('Tab');
    await expect(inventoryPage.form.field('stock')).toBeFocused();
    await page.keyboard.type('4');

    await page.keyboard.press('Tab');
    await expect(inventoryPage.form.field('genre')).toBeFocused();
    await inventoryPage.form.field('genre').selectOption('mystery');

    await inventoryPage.form.submitButton.focus();
    await page.keyboard.press('Enter');

    await inventoryPage.expectToast('Book created');
    await inventoryPage.expectRowVisible(title);
    expect(await api.findByTitle(title)).toMatchObject({
      title,
      author: 'Keyboard Author',
      genre: 'mystery',
    });
  });

  test('A11Y-009 the catalog can be searched and opened by keyboard alone', async ({
    page,
    catalogPage,
    bookDetailPage,
  }) => {
    await catalogPage.goto();

    await catalogPage.searchBox.focus();
    await page.keyboard.type(SEED.sample.title);
    await catalogPage.expectResultCount(1);

    await catalogPage.bookLink(SEED.sample.title).focus();
    await page.keyboard.press('Enter');

    await bookDetailPage.expectLoaded(SEED.sample.title);
  });

  test('A11Y-010 the dialog closes on Escape and returns focus to its trigger @core', async ({
    page,
    inventoryPage,
  }) => {
    await inventoryPage.goto();
    await inventoryPage.openAddForm();

    await page.keyboard.press('Escape');

    await inventoryPage.form.expectClosed();
    await expect(inventoryPage.addBookButton).toBeFocused();
  });

  test('A11Y-011 the delete confirmation returns focus to the row button', async ({
    page,
    inventoryPage,
  }) => {
    await inventoryPage.goto();
    const trigger = inventoryPage.deleteButton(SEED.sample.title);
    await trigger.click();
    await inventoryPage.confirmDialog.expectOpen(SEED.sample.title);

    await page.keyboard.press('Escape');

    await expect(inventoryPage.confirmDialog.root).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('A11Y-012 tabbing never leaves the open dialog for the page behind it', async ({
    page,
    inventoryPage,
  }) => {
    await inventoryPage.goto();
    await inventoryPage.openAddForm();

    const visited: string[] = [];
    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press('Tab');
      visited.push(
        await page.evaluate(() => {
          const active = document.activeElement;
          const dialog = document.getElementById('book-dialog');
          if (dialog?.contains(active)) return `dialog:${active?.id}`;
          return `outside:${active?.tagName.toLowerCase()}#${active?.id ?? ''}`;
        }),
      );
    }

    // A native modal dialog parks on document.body for one step as the cycle
    // wraps. Everything else must stay inside the dialog; the page behind it
    // is inert and must never take focus.
    const escaped = visited.filter(
      (entry) => !entry.startsWith('dialog:') && entry !== 'outside:body#',
    );
    expect(escaped, `focus reached the page behind the dialog: ${escaped.join(', ')}`).toEqual([]);

    expect(visited.filter((entry) => entry.startsWith('dialog:')).length).toBeGreaterThan(10);
    expect(visited).toContain('dialog:f-title');
  });

  test('A11Y-013 status and error regions carry the right roles', async ({
    inventoryPage,
  }) => {
    await inventoryPage.goto();
    await inventoryPage.openAddForm();
    await inventoryPage.form.save();

    await expect(inventoryPage.form.errorFor('title')).toHaveRole('alert');

    await inventoryPage.form.cancel();
    await inventoryPage.deleteBook(SEED.sample.title);

    await expect(inventoryPage.toast).toHaveRole('status');
  });

  test('A11Y-014 the cart count is part of the link accessible name', async ({
    api,
    catalogPage,
  }) => {
    const book = await api.findByTitle(SEED.sample.title);
    await api.addToCart(book!.id, 3);

    await catalogPage.goto();

    await expect(catalogPage.nav.cartLink).toHaveAccessibleName('Cart (3)');
  });
});
