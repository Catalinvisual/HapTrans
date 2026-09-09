import { z } from 'zod';

export const createCurrencySchema = z.object({
  code: z.string().length(3),
  name: z.string().min(1),
  symbol: z.string().min(1).max(10),
  decimalPlaces: z.number().int().min(0).max(6).default(2),
  isActive: z.boolean().default(true),
});

export const updateCurrencySchema = z.object({
  code: z.string().length(3).optional(),
  name: z.string().min(1).optional(),
  symbol: z.string().min(1).max(10).optional(),
  decimalPlaces: z.number().int().min(0).max(6).optional(),
  isActive: z.boolean().optional(),
});

export type CreateCurrencyDto = z.infer<typeof createCurrencySchema>;
export type UpdateCurrencyDto = z.infer<typeof updateCurrencySchema>;
