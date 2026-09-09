import { z } from 'zod';

export const createRegionSchema = z.object({
  countryId: z.string().uuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  localizedNames: z.record(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export const updateRegionSchema = z.object({
  countryId: z.string().uuid().optional(),
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).optional(),
  localizedNames: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type CreateRegionDto = z.infer<typeof createRegionSchema>;
export type UpdateRegionDto = z.infer<typeof updateRegionSchema>;
