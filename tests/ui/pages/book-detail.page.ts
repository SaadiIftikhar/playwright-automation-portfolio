import { expect, type Locator, type Page } from '@playwright/test';
import { NavComponent } from '../components/nav.component';

export class BookDetailPage {
  readonly nav: NavComponent;
  readonly quantityInput: Locator;
  readonly addToCartButton: Locator;
  readonly busyButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly notFoundHeading: Locator;
  readonly backLink: Locator;

  constructor(readonly page: Page) {
    this.nav = new NavComponent(page);
    this.quantityInput = page.getByRole('spinbutton', { name: 'Quantity' });
    this.addToCartButton = page.getByRole('button', { name: 'Add to cart' });
    this.busyButton = page.getByRole('button', { name: /Adding/ });
    this.successMessage = page.getByRole('status').filter({ hasText: 'Added to cart' });
    this.errorMessage = page.getByRole('alert');
    this.notFoundHeading = page.getByRole('heading', { name: 'Book not found' });
    this.backLink = page.getByRole('link', { name: 'Back to catalog' });
  }

  async goto(bookId: string): Promise<void> {
    await this.page.goto(`/book.html?id=${encodeURIComponent(bookId)}`);
  }

  title(name: string): Locator {
    return this.page.getByRole('heading', { name, level: 1 });
  }

  get price(): Locator {
    return this.page.locator('#book-price');
  }

  get stockBadge(): Locator {
    return this.page.locator('#book-stock');
  }

  get description(): Locator {
    return this.page.locator('#book-description');
  }

  async setQuantity(quantity: number): Promise<void> {
    await this.quantityInput.fill(String(quantity));
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }

  async addToCartAndWait(): Promise<void> {
    await this.addToCartButton.click();
    await expect(this.successMessage).toBeVisible();
  }

  async expectLoaded(title: string): Promise<void> {
    await expect(this.title(title)).toBeVisible();
  }

  async expectNotFound(): Promise<void> {
    await expect(this.notFoundHeading).toBeVisible();
  }
}
