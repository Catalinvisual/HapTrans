import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
});

export type AnalyticsQueryDto = z.infer<typeof analyticsQuerySchema>;