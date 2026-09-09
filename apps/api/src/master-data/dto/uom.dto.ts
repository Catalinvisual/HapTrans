import { z } from 'zod';

export const createUomSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  localizedNames: z.record(z.string()).optional(),
  category: z.string().min(1).max(50),
  baseUnitId: z.string().uuid().optional(),
  conversionFactor: z.number().positive().optional(),
  isActive: z.boolean().default(true),
});

export const updateUomSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).optional(),
  localizedNames: z.record(z.string()).optional(),
  category: z.string().min(1).max(50).optional(),
  baseUnitId: z.string().uuid().optional(),
  conversionFactor: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export type CreateUomDto = z.infer<typeof createUomSchema>;
export type UpdateUomDto = z.infer<typeof updateUomSchema>;
