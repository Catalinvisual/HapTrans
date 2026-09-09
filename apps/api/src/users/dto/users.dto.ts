import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyId: z.string().uuid(),
  roleIds: z.array(z.string().uuid()).min(1),
  branchId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  status: z.enum(['ACTIVE', 'INVITED', 'PENDING_VERIFICATION', 'DISABLED', 'LOCKED']).optional(),
  companyId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
