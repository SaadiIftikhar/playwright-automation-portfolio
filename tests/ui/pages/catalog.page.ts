import { expect, type Locator, type Page } from '@playwright/test';
import { NavComponent } from '../components/nav.component';

export class CatalogPage {
  readonly nav: NavComponent;
  readonly heading: Locator;
  readonly searchBox: Locator;
  readonly genreFilter: Locator;
  readonly sortSelect: Locator;
  readonly inStockCheckbox: Locator;
  readonly clearFiltersButton: Locator;
  readonly showAllBooksButton: Locator;
  readonly results: Locator;
  readonly bookCards: Locator;
  readonly resultCount: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;
  readonly emptyStateMessage: Locator;

  constructor(readonly page: Page) {
    this.nav = new NavComponent(page);
    this.heading = page.getByRole('heading', { name: 'Browse books', level: 1 });
    this.searchBox = page.getByRole('searchbox', { name: 'Search books' });
    this.genreFilter = page.getByRole('combobox', { name: 'Genre' });
    this.sortSelect = page.getByRole('combobox', { name: 'Sort by' });
    this.inStockCheckbox = page.getByRole('checkbox', { name: 'In stock only' });
    this.clearFiltersButton = page.getByRole('button', { name: 'Clear filters' });
    this.showAllBooksButton = page.getByRole('button', { name: 'Show all books' });
    this.results = page.getByRole('list', { name: 'Book results' });
    this.bookCards = this.results.getByRole('listitem');
    this.resultCount = page.getByTestId('result-count');
    this.loadingIndicator = page.getByRole('status');
    this.errorMessage = page.getByRole('alert');
    this.emptyStateMessage = page.getByText('No books match your search.');
  }

  async goto(): Promise<void> {
    await this.page.goto('/index.html');
    await expect(this.heading).toBeVisible();
  }

  card(title: string): Locator {
    return this.bookCards.filter({
      has: this.page.getByRole('heading', { name: title, exact: true }),
    });
  }

  bookLink(title: string): Locator {
    return this.results.getByRole('link', { name: title, exact: true });
  }

  async openBook(title: string): Promise<void> {
    await this.bookLink(title).click();
  }

  async search(term: string): Promise<void> {
    await this.searchBox.fill(term);
  }

  async filterByGenre(genre: string): Promise<void> {
    await this.genreFilter.selectOption(genre);
  }

  async sortBy(value: string): Promise<void> {
    await this.sortSelect.selectOption(value);
  }

  async onlyInStock(): Promise<void> {
    await this.inStockCheckbox.check();
  }

  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
  }

  async titles(): Promise<string[]> {
    return this.bookCards.getByRole('heading').allInnerTexts();
  }

  async prices(): Promise<number[]> {
    const raw = await this.bookCards.locator('.price').allInnerTexts();
    return raw.map((value) => Number(value.replace(/[^0-9.]/g, '')));
  }

  /**
   * Anchors on the live result count rather than a raw item count, so the
   * assertion only settles once the newest response has painted.
   */
  async expectResultCount(count: number): Promise<void> {
    await expect(this.resultCount).toHaveText(`${count} ${count === 1 ? 'book' : 'books'}`);
    await expect(this.bookCards).toHaveCount(count);
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyStateMessage).toBeVisible();
    await expect(this.showAllBooksButton).toBeVisible();
    await expect(this.bookCards).toHaveCount(0);
  }
}
