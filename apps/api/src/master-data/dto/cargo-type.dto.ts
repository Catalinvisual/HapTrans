import { z } from 'zod';

export const createCargoTypeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  localizedNames: z.record(z.string()).optional(),
  isAdr: z.boolean().default(false),
  isTemperatureControlled: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateCargoTypeSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).optional(),
  localizedNames: z.record(z.string()).optional(),
  isAdr: z.boolean().optional(),
  isTemperatureControlled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CreateCargoTypeDto = z.infer<typeof createCargoTypeSchema>;
export type UpdateCargoTypeDto = z.infer<typeof updateCargoTypeSchema>;
