import { expect, type Locator, type Page } from '@playwright/test';
import { NavComponent } from '../components/nav.component';

export class CartPage {
  readonly nav: NavComponent;
  readonly heading: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly subtotal: Locator;
  readonly clearCartButton: Locator;
  readonly emptyStateMessage: Locator;
  readonly errorMessage: Locator;

  constructor(readonly page: Page) {
    this.nav = new NavComponent(page);
    this.heading = page.getByRole('heading', { name: 'Your cart', level: 1 });
    this.table = page.getByRole('table', { name: 'Cart contents' });
    this.rows = this.table
      .getByRole('row')
      .filter({ hasNot: page.getByRole('columnheader') });
    this.subtotal = page.locator('#subtotal');
    this.clearCartButton = page.getByRole('button', { name: 'Clear cart' });
    this.emptyStateMessage = page.getByText('Your cart is empty.');
    this.errorMessage = page.getByRole('alert');
  }

  async goto(): Promise<void> {
    await this.page.goto('/cart.html');
    await expect(this.heading).toBeVisible();
  }

  row(title: string): Locator {
    return this.rows.filter({
      has: this.page.getByRole('cell', { name: title, exact: true }),
    });
  }

  removeButton(title: string): Locator {
    return this.page.getByRole('button', { name: `Remove ${title}` });
  }

  async removeItem(title: string): Promise<void> {
    await this.removeButton(title).click();
  }

  async clearCart(): Promise<void> {
    await this.clearCartButton.click();
  }

  async expectItem(title: string, quantity: number, lineTotal: string): Promise<void> {
    const row = this.row(title);
    await expect(row).toBeVisible();
    await expect(row.getByRole('cell').nth(2)).toHaveText(String(quantity));
    await expect(row.getByRole('cell').nth(3)).toHaveText(lineTotal);
  }

  async expectSubtotal(value: string): Promise<void> {
    await expect(this.subtotal).toHaveText(value);
  }

  async expectEmpty(): Promise<void> {
    await expect(this.emptyStateMessage).toBeVisible();
    await expect(this.table).toBeHidden();
  }
}
