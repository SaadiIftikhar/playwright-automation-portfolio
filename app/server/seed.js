// Fixed timestamps keep seeded data deterministic across runs.
const BASE_TIME = Date.parse('2024-01-15T09:00:00.000Z');

export const SEED_BOOKS = [
  {
    title: 'The Silent Library',
    author: 'Mara Ellison',
    isbn: '9780306406157',
    price: 14.99,
    stock: 12,
    genre: 'mystery',
    publishedYear: 2019,
    description: 'A librarian uncovers a code hidden in overdue slips.',
  },
  {
    title: 'Orbital Drift',
    author: 'Kai Nakamura',
    isbn: '9780451524935',
    price: 22.5,
    stock: 4,
    genre: 'sci-fi',
    publishedYear: 2021,
    description: 'Three engineers wake to find their station has moved.',
  },
  {
    title: 'Salt and Iron',
    author: 'Bea Okonkwo',
    isbn: '9780140449136',
    price: 9.99,
    stock: 0,
    genre: 'fiction',
    publishedYear: 2017,
    description: 'A coastal family saga spanning four generations.',
  },
  {
    title: 'The Cartographer of Small Things',
    author: 'Lior Adam',
    isbn: '9780679783268',
    price: 17.25,
    stock: 7,
    genre: 'fiction',
    publishedYear: 2020,
    description: 'Maps of places that only exist for a single afternoon.',
  },
  {
    title: 'Quiet Machines',
    author: 'Kai Nakamura',
    isbn: '9780262033848',
    price: 31.0,
    stock: 3,
    genre: 'non-fiction',
    publishedYear: 2022,
    description: 'How automation reshaped the factory floor, told in ten objects.',
  },
  {
    title: 'Marginalia',
    author: 'Petra Vance',
    isbn: '9780393356274',
    price: 12.0,
    stock: 25,
    genre: 'poetry',
    publishedYear: 2018,
    description: 'Poems written in the margins of borrowed books.',
  },
  {
    title: 'The Understudy',
    author: 'Mara Ellison',
    isbn: '9781501123465',
    price: 16.4,
    stock: 0,
    genre: 'mystery',
    publishedYear: 2023,
    description: 'Every night she plays a woman who was never found.',
  },
  {
    title: 'Fieldwork',
    author: 'Ines Duarte',
    isbn: '9780199535569',
    price: 28.75,
    stock: 9,
    genre: 'biography',
    publishedYear: 2016,
    description: 'Forty years of notebooks from a working anthropologist.',
  },
  {
    title: 'Hollow Stars',
    author: 'Tomas Reyes',
    isbn: '9780545010221',
    price: 19.99,
    stock: 15,
    genre: 'sci-fi',
    publishedYear: 2024,
    description: 'The first ship back reports the colony was never founded.',
  },
  {
    title: 'A Grammar of Rivers',
    author: 'Petra Vance',
    isbn: '9780374533557',
    price: 11.5,
    stock: 6,
    genre: 'poetry',
    publishedYear: 2015,
    description: 'Water described as a language with its own tenses.',
  },
  {
    title: 'The Longest Winter',
    author: 'Ines Duarte',
    isbn: '9780062316097',
    price: 24.0,
    stock: 2,
    genre: 'non-fiction',
    publishedYear: 2013,
    description: 'An account of the winter that closed the northern passes.',
  },
  {
    title: 'Paper Lanterns',
    author: 'Bea Okonkwo',
    isbn: '9780316769488',
    price: 13.25,
    stock: 18,
    genre: 'fiction',
    publishedYear: 2012,
    description: 'A festival, a missed train, and everything that followed.',
  },
];

export function buildSeedBooks() {
  const books = new Map();
  SEED_BOOKS.forEach((book, index) => {
    const id = `bk_${String(index + 1).padStart(3, '0')}`;
    const timestamp = new Date(BASE_TIME + index * 86400000).toISOString();
    books.set(id, {
      id,
      ...book,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });
  return books;
}
