const BASE = '/api';

export class ApiError extends Error {
  constructor(status, payload) {
    const detail = payload?.error?.message ?? 'Request failed';
    super(detail);
    this.status = status;
    this.code = payload?.error?.code ?? 'UNKNOWN';
    this.details = payload?.error?.details ?? [];
  }

  fieldErrors() {
    return Object.fromEntries(
      this.details.filter((d) => d.field).map((d) => [d.field, d.message]),
    );
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload;
}

export const api = {
  listBooks: (params = {}, signal) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== '' && value !== null && value !== undefined && value !== false) {
        query.set(key, String(value));
      }
    }
    const suffix = query.toString() ? `?${query}` : '';
    return request(`/books${suffix}`, { signal });
  },
  getBook: (id) => request(`/books/${encodeURIComponent(id)}`),
  createBook: (body) => request('/books', { method: 'POST', body }),
  updateBook: (id, body) =>
    request(`/books/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deleteBook: (id) => request(`/books/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getCart: () => request('/cart'),
  addToCart: (bookId, quantity) =>
    request('/cart/items', { method: 'POST', body: { bookId, quantity } }),
  removeFromCart: (bookId) =>
    request(`/cart/items/${encodeURIComponent(bookId)}`, { method: 'DELETE' }),
  clearCart: () => request('/cart', { method: 'DELETE' }),
  getMeta: () => request('/meta'),
};

export const money = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
