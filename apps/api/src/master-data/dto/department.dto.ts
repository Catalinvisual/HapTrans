import { z } from 'zod';

export const createDepartmentSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  isActive: z.boolean().default(true),
});

export const updateDepartmentSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentDto = z.infer<typeof updateDepartmentSchema>;
