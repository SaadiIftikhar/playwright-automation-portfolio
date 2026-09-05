import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ERROR_CODES } from './constants.js';
import { ApiError, errorBody } from './errors.js';
import { booksRouter } from './routes/books.js';
import { cartRouter } from './routes/cart.js';
import { systemRouter } from './routes/system.js';
import { DEFAULT_TENANT, getStore } from './store.js';

const publicDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
);

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH'];

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use('/api', (req, res, next) => {
    const tenant = req.get('x-test-tenant');
    req.store = getStore(tenant || DEFAULT_TENANT);
    res.set('x-test-tenant', tenant || DEFAULT_TENANT);
    next();
  });

  app.use('/api', (req, res, next) => {
    if (!MUTATING_METHODS.includes(req.method)) return next();
    const contentType = req.get('content-type') ?? '';
    const hasBody =
      req.get('content-length') !== '0' && req.get('content-length') !== undefined;
    if (hasBody && !contentType.includes('application/json')) {
      return next(
        new ApiError(
          415,
          ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
          'Content-Type must be application/json',
        ),
      );
    }
    return next();
  });

  app.use('/api', express.json({ limit: '100kb' }));

  app.use('/api/books', booksRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api', systemRouter);

  app.use('/api', (req, res) => {
    res.status(404).json(
      errorBody(
        new ApiError(
          404,
          ERROR_CODES.NOT_FOUND,
          `No API route matches ${req.method} ${req.originalUrl}`,
        ),
      ),
    );
  });

  app.use(express.static(publicDir, { extensions: ['html'] }));

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error instanceof ApiError) {
      return res.status(error.status).json(errorBody(error));
    }
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json(
        errorBody(
          new ApiError(
            400,
            ERROR_CODES.MALFORMED_JSON,
            'Request body is not valid JSON',
          ),
        ),
      );
    }
    if (error?.type === 'entity.too.large') {
      return res.status(413).json(
        errorBody(
          new ApiError(
            413,
            ERROR_CODES.PAYLOAD_TOO_LARGE,
            'Request body exceeds the 100kb limit',
          ),
        ),
      );
    }

    console.error(error);
    return res
      .status(500)
      .json(errorBody(new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error')));
  });

  return app;
}
