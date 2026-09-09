import { z } from 'zod';

export const createCountrySchema = z.object({
  codeAlpha2: z.string().length(2),
  codeAlpha3: z.string().length(3),
  numericCode: z.string().length(3).optional(),
  name: z.string().min(1),
  localizedNames: z.record(z.string()).optional(),
  isEuMember: z.boolean().default(false),
  isSchengen: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateCountrySchema = z.object({
  codeAlpha2: z.string().length(2).optional(),
  codeAlpha3: z.string().length(3).optional(),
  numericCode: z.string().length(3).optional(),
  name: z.string().min(1).optional(),
  localizedNames: z.record(z.string()).optional(),
  isEuMember: z.boolean().optional(),
  isSchengen: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CreateCountryDto = z.infer<typeof createCountrySchema>;
export type UpdateCountryDto = z.infer<typeof updateCountrySchema>;
