import { z } from 'zod';

export const createServiceTypeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  localizedNames: z.record(z.string()).optional(),
  transportModeId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
});

export const updateServiceTypeSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).optional(),
  localizedNames: z.record(z.string()).optional(),
  transportModeId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

export type CreateServiceTypeDto = z.infer<typeof createServiceTypeSchema>;
export type UpdateServiceTypeDto = z.infer<typeof updateServiceTypeSchema>;
