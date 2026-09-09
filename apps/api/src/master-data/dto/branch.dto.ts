import { z } from 'zod';

export const createBranchSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  type: z.string().min(1).max(50),
  country: z.string().max(2).optional(),
  timezone: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateBranchSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).optional(),
  type: z.string().min(1).max(50).optional(),
  country: z.string().max(2).optional(),
  timezone: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CreateBranchDto = z.infer<typeof createBranchSchema>;
export type UpdateBranchDto = z.infer<typeof updateBranchSchema>;
