import { expect, type Locator, type Page } from '@playwright/test';

export class ConfirmDialog {
  readonly root: Locator;
  readonly message: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Delete book' });
    this.message = this.root.locator('#confirm-message');
    this.confirmButton = this.root.getByRole('button', { name: 'Delete', exact: true });
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel' });
  }

  async expectOpen(bookTitle?: string): Promise<void> {
    await expect(this.root).toBeVisible();
    if (bookTitle) await expect(this.message).toContainText(bookTitle);
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
