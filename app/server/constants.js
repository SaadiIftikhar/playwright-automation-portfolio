export const GENRES = [
  'fiction',
  'non-fiction',
  'sci-fi',
  'mystery',
  'biography',
  'poetry',
];

export const SORT_FIELDS = ['title', 'author', 'price', 'stock', 'createdAt'];

export const LIMITS = {
  title: { min: 1, max: 120 },
  author: { min: 1, max: 80 },
  description: { max: 500 },
  price: { min: 0.01, max: 999.99 },
  stock: { min: 0, max: 10000 },
  publishedYear: { min: 1450, max: new Date().getFullYear() },
  quantity: { min: 1, max: 99 },
  pageSize: { min: 1, max: 100 },
};

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ISBN: 'DUPLICATE_ISBN',
  MALFORMED_JSON: 'MALFORMED_JSON',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
};

// Artificial latency. The whole point of this demo app is to exercise loading
// states and race conditions, so the API is deliberately not instantaneous.
export const DELAYS = {
  list: Number(process.env.LIST_DELAY_MS ?? 120),
  addToCart: Number(process.env.CART_DELAY_MS ?? 700),
};
