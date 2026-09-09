import { z } from 'zod';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

export const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(50),
  isActive: z.boolean().default(true),
});

export const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

export type ListQueryDto = z.infer<typeof listQuerySchema>;
export type CreateDto = z.infer<typeof createSchema>;
export type UpdateDto = z.infer<typeof updateSchema>;
