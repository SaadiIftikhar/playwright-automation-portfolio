import { expect, type Locator, type Page } from '@playwright/test';

export class NavComponent {
  readonly root: Locator;
  readonly brand: Locator;
  readonly catalogLink: Locator;
  readonly inventoryLink: Locator;
  readonly cartLink: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('navigation', { name: 'Main' });
    this.brand = this.root.getByRole('link', { name: 'PageTurn Books' });
    this.catalogLink = this.root.getByRole('link', { name: 'Catalog' });
    this.inventoryLink = this.root.getByRole('link', { name: 'Manage inventory' });
    this.cartLink = this.root.getByRole('link', { name: /^Cart/ });
  }

  /** The cart count lives in the link's accessible name, so this stays role-based. */
  async expectCartCount(count: number): Promise<void> {
    await expect(this.cartLink).toHaveText(`Cart (${count})`);
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }

  async openInventory(): Promise<void> {
    await this.inventoryLink.click();
  }

  async openCatalog(): Promise<void> {
    await this.catalogLink.click();
  }
}
