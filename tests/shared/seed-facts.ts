/**
 * Known properties of the catalog every tenant starts with, mirrored from
 * app/server/seed.js. Tests reference these names instead of repeating
 * unexplained numbers.
 */
export const SEED = {
  totalBooks: 12,
  inStockBooks: 10,
  outOfStockBooks: 2,

  cheapest: { title: 'Salt and Iron', price: 9.99, formatted: '$9.99' },
  mostExpensive: { title: 'Quiet Machines', price: 31.0, formatted: '$31.00' },

  firstByTitleAsc: 'A Grammar of Rivers',
  firstByTitleDesc: 'The Understudy',

  genreCounts: {
    fiction: 3,
    'non-fiction': 2,
    'sci-fi': 2,
    mystery: 2,
    biography: 1,
    poetry: 2,
  },

  authorWithTwoBooks: { name: 'Kai Nakamura', count: 2 },

  // Both Mara Ellison titles are mystery, but only one is in stock.
  narrowing: {
    author: 'Mara Ellison',
    authorCount: 2,
    genre: 'mystery',
    genreCount: 2,
    inStockCount: 1,
    inStockTitle: 'The Silent Library',
  },

  sample: {
    title: 'Orbital Drift',
    author: 'Kai Nakamura',
    genre: 'sci-fi',
    price: '$22.50',
    stock: 4,
  },

  // A second in-stock title, for tests that need two distinct cart lines.
  secondSample: {
    title: 'Marginalia',
    genre: 'poetry',
    price: '$12.00',
    stock: 25,
  },

  outOfStock: { title: 'Salt and Iron' },
} as const;
