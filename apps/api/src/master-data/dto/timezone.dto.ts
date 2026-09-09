import { z } from 'zod';

export const createTimezoneSchema = z.object({
  identifier: z.string().min(1).max(100),
  displayName: z.string().optional(),
  offset: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateTimezoneSchema = z.object({
  identifier: z.string().min(1).max(100).optional(),
  displayName: z.string().optional(),
  offset: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateTimezoneDto = z.infer<typeof createTimezoneSchema>;
export type UpdateTimezoneDto = z.infer<typeof updateTimezoneSchema>;
