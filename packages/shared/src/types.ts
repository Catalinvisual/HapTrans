/**
 * Common cross-platform types: pagination, list queries, API envelope, errors.
 */
import { z } from 'zod';

/** Cursor-based pagination (ADR-022 API). */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Offset-based pagination (master data). */
export interface OffsetPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type SortDirection = 'asc' | 'desc';

export interface Sort {
  field: string;
  direction: SortDirection;
}

export const sortDirectionSchema = z.enum(['asc', 'desc']);

export const sortSchema = z.object({
  field: z.string().min(1),
  direction: sortDirectionSchema,
});

/** Unified API error model (architecture §14). */
export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  requestId?: string;
}

export const apiErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

export const apiErrorBodySchema = z.object({
  statusCode: z.number(),
  code: z.string(),
  message: z.string(),
  details: z.array(apiErrorDetailSchema).optional(),
  requestId: z.string().optional(),
});

/** Locale validation. */
export const localeSchema = z.enum(['ro', 'en', 'nl', 'pl', 'fr', 'es']);
