import { buildSeedBooks } from './seed.js';

const TENANT_TTL_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_TENANT = 'default';

// Every request is scoped to a tenant resolved from the x-test-tenant header.
// Each tenant owns an independent copy of the data, which is what lets the
// whole Playwright suite run fully parallel without resetting shared state.
class Store {
  constructor() {
    this.reset({ seed: true });
  }

  reset({ seed = true } = {}) {
    this.books = seed ? buildSeedBooks() : new Map();
    this.cart = new Map();
    this.sequence = this.books.size;
  }

  nextId() {
    this.sequence += 1;
    return `bk_${String(this.sequence).padStart(3, '0')}`;
  }

  listBooks() {
    return [...this.books.values()];
  }

  getBook(id) {
    return this.books.get(id) ?? null;
  }

  findByIsbn(isbn, excludeId = null) {
    for (const book of this.books.values()) {
      if (book.isbn === isbn && book.id !== excludeId) return book;
    }
    return null;
  }

  insertBook(data) {
    const now = new Date().toISOString();
    const book = { id: this.nextId(), ...data, createdAt: now, updatedAt: now };
    this.books.set(book.id, book);
    return book;
  }

  replaceBook(id, data) {
    const existing = this.books.get(id);
    const book = {
      ...data,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.books.set(id, book);
    return book;
  }

  deleteBook(id) {
    this.cart.delete(id);
    return this.books.delete(id);
  }

  cartItems() {
    return [...this.cart.entries()]
      .map(([bookId, quantity]) => {
        const book = this.books.get(bookId);
        if (!book) return null;
        return {
          bookId,
          title: book.title,
          author: book.author,
          price: book.price,
          quantity,
          lineTotal: Number((book.price * quantity).toFixed(2)),
        };
      })
      .filter(Boolean);
  }
}

const tenants = new Map();

function sweep() {
  const cutoff = Date.now() - TENANT_TTL_MS;
  for (const [id, entry] of tenants) {
    if (id !== DEFAULT_TENANT && entry.lastSeen < cutoff) tenants.delete(id);
  }
}

const sweepTimer = setInterval(sweep, SWEEP_INTERVAL_MS);
sweepTimer.unref();

export function getStore(tenantId = DEFAULT_TENANT) {
  let entry = tenants.get(tenantId);
  if (!entry) {
    entry = { store: new Store(), lastSeen: Date.now() };
    tenants.set(tenantId, entry);
  }
  entry.lastSeen = Date.now();
  return entry.store;
}

export function tenantCount() {
  return tenants.size;
}

export { DEFAULT_TENANT };
