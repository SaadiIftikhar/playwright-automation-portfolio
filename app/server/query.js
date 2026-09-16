import { GENRES, LIMITS, SORT_FIELDS } from './constants.js';
import { validationFailed } from './errors.js';

function parseNumber(field, raw, errors) {
  const value = Number(raw);
  if (raw === '' || Number.isNaN(value)) {
    errors.push({ field, message: `${field} must be a number` });
    return undefined;
  }
  return value;
}

function parseInteger(field, raw, errors, { min, max }) {
  const value = Number(raw);
  if (raw === '' || !Number.isInteger(value)) {
    errors.push({ field, message: `${field} must be a whole number` });
    return undefined;
  }
  if (value < min || value > max) {
    errors.push({ field, message: `${field} must be between ${min} and ${max}` });
    return undefined;
  }
  return value;
}

export function parseListQuery(query) {
  const errors = [];
  const allowed = [
    'search',
    'genre',
    'inStock',
    'minPrice',
    'maxPrice',
    'sort',
    'page',
    'limit',
  ];

  for (const key of Object.keys(query)) {
    if (!allowed.includes(key)) {
      errors.push({ field: key, message: `Unknown query parameter '${key}'` });
    }
  }

  const parsed = {
    search: typeof query.search === 'string' ? query.search.trim() : '',
    genre: null,
    inStock: false,
    minPrice: null,
    maxPrice: null,
    sort: 'title',
    direction: 1,
    page: 1,
    limit: 20,
  };

  if (query.genre !== undefined && query.genre !== '') {
    if (!GENRES.includes(query.genre)) {
      errors.push({
        field: 'genre',
        message: `genre must be one of: ${GENRES.join(', ')}`,
      });
    } else {
      parsed.genre = query.genre;
    }
  }

  if (query.inStock !== undefined && query.inStock !== '') {
    if (query.inStock !== 'true' && query.inStock !== 'false') {
      errors.push({ field: 'inStock', message: "inStock must be 'true' or 'false'" });
    } else {
      parsed.inStock = query.inStock === 'true';
    }
  }

  if (query.minPrice !== undefined && query.minPrice !== '') {
    parsed.minPrice = parseNumber('minPrice', query.minPrice, errors) ?? null;
  }
  if (query.maxPrice !== undefined && query.maxPrice !== '') {
    parsed.maxPrice = parseNumber('maxPrice', query.maxPrice, errors) ?? null;
  }

  if (query.sort !== undefined && query.sort !== '') {
    const raw = String(query.sort);
    const field = raw.startsWith('-') ? raw.slice(1) : raw;
    if (!SORT_FIELDS.includes(field)) {
      errors.push({
        field: 'sort',
        message: `sort must be one of: ${SORT_FIELDS.join(', ')} (prefix with '-' to reverse)`,
      });
    } else {
      parsed.sort = field;
      parsed.direction = raw.startsWith('-') ? -1 : 1;
    }
  }

  if (query.page !== undefined && query.page !== '') {
    parsed.page = parseInteger('page', query.page, errors, { min: 1, max: 100000 }) ?? 1;
  }
  if (query.limit !== undefined && query.limit !== '') {
    parsed.limit =
      parseInteger('limit', query.limit, errors, {
        min: LIMITS.pageSize.min,
        max: LIMITS.pageSize.max,
      }) ?? 20;
  }

  if (errors.length > 0) throw validationFailed(errors);
  return parsed;
}

export function applyQuery(books, q) {
  let result = books;

  if (q.search) {
    // Plain substring match, so regex metacharacters are treated literally.
    const needle = q.search.toLowerCase();
    result = result.filter(
      (b) =>
        b.title.toLowerCase().includes(needle) ||
        b.author.toLowerCase().includes(needle) ||
        b.isbn.includes(needle),
    );
  }
  if (q.genre) result = result.filter((b) => b.genre === q.genre);
  if (q.inStock) result = result.filter((b) => b.stock > 0);
  if (q.minPrice !== null) result = result.filter((b) => b.price >= q.minPrice);
  if (q.maxPrice !== null) result = result.filter((b) => b.price <= q.maxPrice);

  const collator = new Intl.Collator('en', { sensitivity: 'base' });
  result = [...result].sort((a, b) => {
    const left = a[q.sort];
    const right = b[q.sort];
    const cmp = typeof left === 'string' ? collator.compare(left, right) : left - right;
    return cmp * q.direction;
  });

  const total = result.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / q.limit);
  const start = (q.page - 1) * q.limit;
  const items = result.slice(start, start + q.limit);

  return {
    items,
    meta: {
      total,
      count: items.length,
      page: q.page,
      limit: q.limit,
      totalPages,
    },
  };
}
