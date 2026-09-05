import { GENRES, LIMITS } from './constants.js';

const BOOK_FIELDS = [
  'title',
  'author',
  'isbn',
  'price',
  'stock',
  'genre',
  'description',
  'publishedYear',
];

const REQUIRED_FIELDS = ['title', 'author', 'isbn', 'price', 'stock', 'genre'];

const label = {
  title: 'Title',
  author: 'Author',
  isbn: 'ISBN',
  price: 'Price',
  stock: 'Stock',
  genre: 'Genre',
  description: 'Description',
  publishedYear: 'Published year',
};

export function normaliseIsbn(value) {
  return String(value).replace(/[\s-]/g, '');
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateString(field, raw, errors, { min = 0, max, required }) {
  if (typeof raw !== 'string') {
    errors.push({ field, message: `${label[field]} must be a string` });
    return undefined;
  }
  const value = raw.trim();
  if (required && value.length === 0) {
    errors.push({ field, message: `${label[field]} is required` });
    return undefined;
  }
  if (value.length < min) {
    errors.push({
      field,
      message: `${label[field]} must be at least ${min} character${min === 1 ? '' : 's'}`,
    });
    return undefined;
  }
  if (value.length > max) {
    errors.push({
      field,
      message: `${label[field]} must be ${max} characters or fewer`,
    });
    return undefined;
  }
  return value;
}

function validateNumber(field, raw, errors, { min, max, integer = false }) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    errors.push({ field, message: `${label[field]} must be a number` });
    return undefined;
  }
  if (integer && !Number.isInteger(raw)) {
    errors.push({ field, message: `${label[field]} must be a whole number` });
    return undefined;
  }
  if (raw < min) {
    errors.push({ field, message: `${label[field]} must be at least ${min}` });
    return undefined;
  }
  if (raw > max) {
    errors.push({ field, message: `${label[field]} must be at most ${max}` });
    return undefined;
  }
  return raw;
}

function validateField(field, raw, errors) {
  switch (field) {
    case 'title':
      return validateString(field, raw, errors, {
        min: LIMITS.title.min,
        max: LIMITS.title.max,
        required: true,
      });
    case 'author':
      return validateString(field, raw, errors, {
        min: LIMITS.author.min,
        max: LIMITS.author.max,
        required: true,
      });
    case 'isbn': {
      if (typeof raw !== 'string') {
        errors.push({ field, message: 'ISBN must be a string' });
        return undefined;
      }
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        errors.push({ field, message: 'ISBN is required' });
        return undefined;
      }
      const digits = normaliseIsbn(trimmed);
      if (!/^\d{13}$/.test(digits) || !/^97[89]/.test(digits)) {
        errors.push({
          field,
          message: 'ISBN must be 13 digits beginning with 978 or 979',
        });
        return undefined;
      }
      return digits;
    }
    case 'price': {
      const value = validateNumber(field, raw, errors, {
        min: LIMITS.price.min,
        max: LIMITS.price.max,
      });
      if (value === undefined) return undefined;
      if (Number(value.toFixed(2)) !== value) {
        errors.push({
          field,
          message: 'Price must have at most 2 decimal places',
        });
        return undefined;
      }
      return value;
    }
    case 'stock':
      return validateNumber(field, raw, errors, {
        min: LIMITS.stock.min,
        max: LIMITS.stock.max,
        integer: true,
      });
    case 'genre': {
      if (typeof raw !== 'string') {
        errors.push({ field, message: 'Genre must be a string' });
        return undefined;
      }
      if (!GENRES.includes(raw)) {
        errors.push({
          field,
          message: `Genre must be one of: ${GENRES.join(', ')}`,
        });
        return undefined;
      }
      return raw;
    }
    case 'description':
      if (raw === null || raw === '') return '';
      return validateString(field, raw, errors, {
        max: LIMITS.description.max,
        required: false,
      });
    case 'publishedYear':
      if (raw === null) return null;
      return validateNumber(field, raw, errors, {
        min: LIMITS.publishedYear.min,
        max: LIMITS.publishedYear.max,
        integer: true,
      });
    default:
      return undefined;
  }
}

export function validateBook(body, { partial = false } = {}) {
  const errors = [];

  if (!isPlainObject(body)) {
    return {
      errors: [{ field: 'body', message: 'Request body must be a JSON object' }],
    };
  }

  const keys = Object.keys(body);
  for (const key of keys) {
    if (!BOOK_FIELDS.includes(key)) {
      errors.push({ field: key, message: `Unknown field '${key}' is not allowed` });
    }
  }

  if (partial && keys.length === 0) {
    errors.push({ field: 'body', message: 'At least one field must be provided' });
  }

  const value = {};
  for (const field of BOOK_FIELDS) {
    const provided = Object.prototype.hasOwnProperty.call(body, field);

    if (!provided) {
      if (!partial && REQUIRED_FIELDS.includes(field)) {
        errors.push({ field, message: `${label[field]} is required` });
      }
      continue;
    }

    if (body[field] === undefined) {
      errors.push({ field, message: `${label[field]} is required` });
      continue;
    }

    const parsed = validateField(field, body[field], errors);
    if (parsed !== undefined) value[field] = parsed;
  }

  if (errors.length > 0) return { errors };

  if (!partial) {
    value.description = value.description ?? '';
    value.publishedYear = value.publishedYear ?? null;
  }

  return { value, errors: [] };
}

export { BOOK_FIELDS, REQUIRED_FIELDS };
