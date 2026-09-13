import type { APIResponse } from '@playwright/test';
import { expect } from '@playwright/test';
import { z } from 'zod';
import { GENRES } from '../../shared/types';

export const genreSchema = z.enum(GENRES);

export const bookSchema = z
  .object({
    id: z.string().regex(/^bk_\d+$/, 'id must look like bk_001'),
    title: z.string().min(1).max(120),
    author: z.string().min(1).max(80),
    isbn: z.string().regex(/^97[89]\d{10}$/, 'isbn must be a normalised ISBN-13'),
    price: z.number().gte(0.01).lte(999.99),
    stock: z.number().int().gte(0).lte(10000),
    genre: genreSchema,
    description: z.string().max(500),
    publishedYear: z.number().int().gte(1450).nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const listMetaSchema = z
  .object({
    total: z.number().int().nonnegative(),
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  })
  .strict();

export const bookEnvelopeSchema = z.object({ data: bookSchema }).strict();

export const bookListEnvelopeSchema = z
  .object({ data: z.array(bookSchema), meta: listMetaSchema })
  .strict();

export const cartItemSchema = z
  .object({
    bookId: z.string().regex(/^bk_\d+$/),
    title: z.string().min(1),
    author: z.string().min(1),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
    lineTotal: z.number().nonnegative(),
  })
  .strict();

export const cartSchema = z
  .object({
    items: z.array(cartItemSchema),
    itemCount: z.number().int().nonnegative(),
    subtotal: z.number().nonnegative(),
  })
  .strict();

export const cartEnvelopeSchema = z.object({ data: cartSchema }).strict();

export const errorDetailSchema = z
  .object({ field: z.string().min(1), message: z.string().min(1) })
  .strict();

export const errorEnvelopeSchema = z
  .object({
    error: z
      .object({
        code: z.string().regex(/^[A-Z_]+$/, 'code must be SCREAMING_SNAKE_CASE'),
        message: z.string().min(1),
        details: z.array(errorDetailSchema),
      })
      .strict(),
  })
  .strict();

export const healthEnvelopeSchema = z
  .object({
    data: z.object({ status: z.literal('ok'), uptime: z.number().nonnegative() }).strict(),
  })
  .strict();

export const metaEnvelopeSchema = z
  .object({
    data: z
      .object({
        genres: z.array(genreSchema).nonempty(),
        limits: z.record(z.string(), z.record(z.string(), z.number())),
      })
      .strict(),
  })
  .strict();

export type BookPayload = z.infer<typeof bookSchema>;
export type CartPayload = z.infer<typeof cartSchema>;
export type ErrorPayload = z.infer<typeof errorEnvelopeSchema>;

/**
 * Parses a response body against a schema and fails with the actual issues
 * rather than a bare "expected true, got false". Every contract assertion in
 * the API suite goes through here instead of spot-checking individual fields.
 */
export async function expectSchema<T>(
  response: APIResponse,
  schema: z.ZodType<T>,
  expectedStatus: number,
): Promise<T> {
  const body = await response.json().catch(() => undefined);

  expect(
    response.status(),
    `expected ${expectedStatus} but got ${response.status()} with body ${JSON.stringify(body)}`,
  ).toBe(expectedStatus);

  expect(response.headers()['content-type']).toContain('application/json');

  const result = schema.safeParse(body);
  expect(
    result.success,
    result.success
      ? ''
      : `response did not match schema:\n${z.prettifyError(result.error)}\n\nbody: ${JSON.stringify(body, null, 2)}`,
  ).toBe(true);

  return (result as { success: true; data: T }).data;
}

/** Asserts an error response: status, schema, code, and optionally the fields named in details. */
export async function expectError(
  response: APIResponse,
  expectedStatus: number,
  expectedCode: string,
  expectedFields?: string[],
): Promise<ErrorPayload> {
  const body = await expectSchema(response, errorEnvelopeSchema, expectedStatus);

  expect(body.error.code).toBe(expectedCode);

  if (expectedFields) {
    const fields = body.error.details.map((detail) => detail.field).sort();
    expect(fields).toEqual([...expectedFields].sort());
  }

  return body;
}
