import { z } from 'zod';

export const createStatusDefinitionSchema = z.object({
  entityType: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  localizedNames: z.record(z.string()).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isSystem: z.boolean().default(false),
  isTerminal: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
});

export const updateStatusDefinitionSchema = z.object({
  entityType: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).optional(),
  localizedNames: z.record(z.string()).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isSystem: z.boolean().optional(),
  isTerminal: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export type CreateStatusDefinitionDto = z.infer<typeof createStatusDefinitionSchema>;
export type UpdateStatusDefinitionDto = z.infer<typeof updateStatusDefinitionSchema>;
