import { expect, type Locator, type Page } from '@playwright/test';
import { BookFormDialog } from '../components/book-form.component';
import { ConfirmDialog } from '../components/confirm-dialog.component';
import { NavComponent } from '../components/nav.component';
import type { BookInput } from '../../shared/types';

export class InventoryPage {
  readonly nav: NavComponent;
  readonly form: BookFormDialog;
  readonly confirmDialog: ConfirmDialog;
  readonly heading: Locator;
  readonly addBookButton: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly toast: Locator;
  readonly errorMessage: Locator;
  readonly emptyStateMessage: Locator;

  constructor(readonly page: Page) {
    this.nav = new NavComponent(page);
    this.form = new BookFormDialog(page);
    this.confirmDialog = new ConfirmDialog(page);
    this.heading = page.getByRole('heading', { name: 'Manage inventory', level: 1 });
    this.addBookButton = page.getByRole('button', { name: 'Add book' });
    this.table = page.getByRole('table', { name: 'Book inventory' });
    this.rows = this.table.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
    this.toast = page.getByRole('status');
    this.errorMessage = page.locator('#error');
    this.emptyStateMessage = page.getByText('No books in inventory yet.');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin.html');
    await expect(this.heading).toBeVisible();
  }

  row(title: string): Locator {
    return this.rows.filter({ has: this.page.getByRole('cell', { name: title, exact: true }) });
  }

  editButton(title: string): Locator {
    return this.page.getByRole('button', { name: `Edit ${title}` });
  }

  deleteButton(title: string): Locator {
    return this.page.getByRole('button', { name: `Delete ${title}` });
  }

  async openAddForm(): Promise<void> {
    await this.addBookButton.click();
    await this.form.expectOpen('Add book');
  }

  async openEditForm(title: string): Promise<void> {
    await this.editButton(title).click();
    await this.form.expectOpen('Edit book');
  }

  async createBook(input: Partial<BookInput>): Promise<void> {
    await this.openAddForm();
    await this.form.submit(input);
  }

  async deleteBook(title: string, { confirm = true } = {}): Promise<void> {
    await this.deleteButton(title).click();
    await this.confirmDialog.expectOpen(title);
    if (confirm) await this.confirmDialog.confirm();
    else await this.confirmDialog.cancel();
  }

  async titles(): Promise<string[]> {
    return this.rows.getByRole('cell').first().allInnerTexts();
  }

  /**
   * The toast is only shown after the table has been reloaded, so waiting on it
   * means the row list is already up to date.
   */
  async expectToast(message: string | RegExp): Promise<void> {
    await expect(this.toast).toBeVisible();
    await expect(this.toast).toHaveText(message);
  }

  async expectRowCount(count: number): Promise<void> {
    await expect(this.rows).toHaveCount(count);
  }

  async expectRowVisible(title: string): Promise<void> {
    await expect(this.row(title)).toBeVisible();
  }

  async expectRowAbsent(title: string): Promise<void> {
    await expect(this.row(title)).toHaveCount(0);
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyStateMessage).toBeVisible();
    await expect(this.rows).toHaveCount(0);
  }
}
