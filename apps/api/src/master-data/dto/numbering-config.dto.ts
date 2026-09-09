import { z } from 'zod';

export const createNumberingConfigSchema = z.object({
  branchId: z.string().uuid().optional(),
  entityType: z.string().min(1).max(100),
  prefix: z.string().max(20).optional(),
  suffix: z.string().max(20).optional(),
  sequence: z.number().int().positive().default(1),
  minDigits: z.number().int().positive().default(6),
  resetPolicy: z.string().max(20).optional(),
  isActive: z.boolean().default(true),
});

export const updateNumberingConfigSchema = z.object({
  branchId: z.string().uuid().optional(),
  entityType: z.string().min(1).max(100).optional(),
  prefix: z.string().max(20).optional(),
  suffix: z.string().max(20).optional(),
  sequence: z.number().int().positive().optional(),
  minDigits: z.number().int().positive().optional(),
  resetPolicy: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
});

export type CreateNumberingConfigDto = z.infer<typeof createNumberingConfigSchema>;
export type UpdateNumberingConfigDto = z.infer<typeof updateNumberingConfigSchema>;
