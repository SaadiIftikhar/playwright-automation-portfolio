import { ERROR_CODES } from './constants.js';

export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (resource, id) =>
  new ApiError(
    404,
    ERROR_CODES.NOT_FOUND,
    `${resource} with id '${id}' was not found`,
  );

export const validationFailed = (details) =>
  new ApiError(
    400,
    ERROR_CODES.VALIDATION_ERROR,
    'Request failed validation',
    details,
  );

export const duplicateIsbn = (isbn) =>
  new ApiError(
    409,
    ERROR_CODES.DUPLICATE_ISBN,
    `A book with ISBN '${isbn}' already exists`,
    [{ field: 'isbn', message: 'ISBN must be unique' }],
  );

export function errorBody(error) {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? [],
    },
  };
}
