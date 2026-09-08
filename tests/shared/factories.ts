import { randomUUID } from 'node:crypto';
import type { BookInput, Genre } from './types';

export const TENANT_HEADER = 'x-test-tenant';

/**
 * Every test runs against its own tenant, so the backend hands it a private
 * copy of the seed data. That is what keeps the suite parallel-safe without
 * any shared reset step between tests.
 */
export function newTenantId(): string {
  return `test-${randomUUID()}`;
}

let isbnCounter = 0;

export function uniqueIsbn(): string {
  isbnCounter += 1;
  const body = `${process.pid}${Date.now()}${isbnCounter}`.slice(-10).padStart(10, '0');
  return `978${body}`;
}

export function bookInput(overrides: Partial<BookInput> = {}): BookInput {
  const suffix = randomUUID().slice(0, 8);
  return {
    title: `Test Book ${suffix}`,
    author: `Author ${suffix}`,
    isbn: uniqueIsbn(),
    price: 19.99,
    stock: 5,
    genre: 'fiction' as Genre,
    description: 'Created by the automated test suite.',
    publishedYear: 2020,
    ...overrides,
  };
}

export function repeat(char: string, length: number): string {
  return char.repeat(length);
}
