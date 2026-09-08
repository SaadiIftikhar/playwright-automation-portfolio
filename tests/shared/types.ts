export const GENRES = [
  'fiction',
  'non-fiction',
  'sci-fi',
  'mystery',
  'biography',
  'poetry',
] as const;

export type Genre = (typeof GENRES)[number];

export interface BookInput {
  title: string;
  author: string;
  isbn: string;
  price: number;
  stock: number;
  genre: Genre;
  description?: string;
  publishedYear?: number | null;
}

export interface Book extends Required<BookInput> {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListMeta {
  total: number;
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CartItem {
  bookId: string;
  title: string;
  author: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

export interface ListQuery {
  search?: string;
  genre?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

/** Field limits mirrored from app/server/constants.js, used to build boundary cases. */
export const LIMITS = {
  title: { min: 1, max: 120 },
  author: { min: 1, max: 80 },
  description: { max: 500 },
  price: { min: 0.01, max: 999.99 },
  stock: { min: 0, max: 10000 },
  publishedYear: { min: 1450, max: new Date().getFullYear() },
} as const;

export const SEEDED_BOOK_COUNT = 12;
