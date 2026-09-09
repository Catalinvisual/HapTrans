import { z } from 'zod';

export const createDocumentTypeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  localizedNames: z.record(z.string()).optional(),
  category: z.string().max(100).optional(),
  isRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateDocumentTypeSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).optional(),
  localizedNames: z.record(z.string()).optional(),
  category: z.string().max(100).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CreateDocumentTypeDto = z.infer<typeof createDocumentTypeSchema>;
export type UpdateDocumentTypeDto = z.infer<typeof updateDocumentTypeSchema>;
