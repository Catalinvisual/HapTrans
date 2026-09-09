import { z } from 'zod';

export const listCustomersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  status: z.enum(['PROSPECT', 'ACTIVE', 'ON_HOLD', 'INACTIVE', 'ARCHIVED']).optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type ListCustomersDto = z.infer<typeof listCustomersSchema>;
