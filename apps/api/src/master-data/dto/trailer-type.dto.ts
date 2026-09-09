import { z } from 'zod';

export const createTrailerTypeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  description: z.string().optional(),
  payloadKg: z.number().positive().optional(),
  volumeM3: z.number().positive().optional(),
  lengthM: z.number().positive().optional(),
  loadingMeters: z.number().positive().optional(),
  isAdrCapable: z.boolean().default(false),
  isTemperatureControlled: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateTrailerTypeSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  payloadKg: z.number().positive().optional(),
  volumeM3: z.number().positive().optional(),
  lengthM: z.number().positive().optional(),
  loadingMeters: z.number().positive().optional(),
  isAdrCapable: z.boolean().optional(),
  isTemperatureControlled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CreateTrailerTypeDto = z.infer<typeof createTrailerTypeSchema>;
export type UpdateTrailerTypeDto = z.infer<typeof updateTrailerTypeSchema>;
