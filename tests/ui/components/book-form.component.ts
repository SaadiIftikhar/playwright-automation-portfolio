import { expect, type Locator, type Page } from '@playwright/test';
import type { BookInput } from '../../shared/types';

export type BookFormField =
  | 'title'
  | 'author'
  | 'isbn'
  | 'price'
  | 'stock'
  | 'genre'
  | 'publishedYear'
  | 'description';

const FIELD_LABELS: Record<BookFormField, string> = {
  title: 'Title',
  author: 'Author',
  isbn: 'ISBN',
  price: 'Price',
  stock: 'Stock',
  genre: 'Genre',
  publishedYear: 'Published year',
  description: 'Description',
};

/** The add/edit dialog on the inventory page. */
export class BookFormDialog {
  readonly root: Locator;
  readonly heading: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly formError: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: /book$/i });
    this.heading = this.root.getByRole('heading');
    this.saveButton = this.root.getByRole('button', { name: 'Save book' });
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel' });
    this.formError = this.root.locator('#form-error');
  }

  field(name: BookFormField): Locator {
    return this.root.getByLabel(FIELD_LABELS[name], { exact: true });
  }

  errorFor(name: BookFormField): Locator {
    return this.root.locator(`#e-${name}`);
  }

  get visibleErrors(): Locator {
    return this.root.getByRole('alert');
  }

  async expectOpen(title: 'Add book' | 'Edit book'): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.heading).toHaveText(title);
  }

  async expectClosed(): Promise<void> {
    await expect(this.root).toBeHidden();
  }

  async fillField(name: BookFormField, value: string): Promise<void> {
    if (name === 'genre') {
      await this.field(name).selectOption(value);
      return;
    }
    await this.field(name).fill(value);
  }

  async fill(input: Partial<BookInput>): Promise<void> {
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined || value === null) continue;
      await this.fillField(key as BookFormField, String(value));
    }
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async submit(input: Partial<BookInput>): Promise<void> {
    await this.fill(input);
    await this.save();
  }

  async expectFieldError(name: BookFormField, message: string | RegExp): Promise<void> {
    await expect(this.errorFor(name)).toBeVisible();
    await expect(this.errorFor(name)).toHaveText(message);
    await expect(this.field(name)).toHaveAttribute('aria-invalid', 'true');
  }

  async expectNoFieldError(name: BookFormField): Promise<void> {
    await expect(this.errorFor(name)).toBeHidden();
  }

  async expectValues(input: Partial<BookInput>): Promise<void> {
    for (const [key, value] of Object.entries(input)) {
      await expect(this.field(key as BookFormField)).toHaveValue(String(value));
    }
  }
}
