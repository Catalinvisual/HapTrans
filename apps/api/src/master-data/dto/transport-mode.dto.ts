import { z } from 'zod';

export const createTransportModeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  localizedNames: z.record(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export const updateTransportModeSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).optional(),
  localizedNames: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type CreateTransportModeDto = z.infer<typeof createTransportModeSchema>;
export type UpdateTransportModeDto = z.infer<typeof updateTransportModeSchema>;
