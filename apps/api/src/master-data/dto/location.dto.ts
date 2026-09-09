import { z } from 'zod';

export const createLocationSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  type: z.string().min(1).max(50),
  branchId: z.string().uuid().optional(),
  countryId: z.string().uuid().optional(),
  regionId: z.string().uuid().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  address: z.record(z.unknown()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timezone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
});

export const updateLocationSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).optional(),
  type: z.string().min(1).max(50).optional(),
  branchId: z.string().uuid().optional(),
  countryId: z.string().uuid().optional(),
  regionId: z.string().uuid().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  address: z.record(z.unknown()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timezone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export type CreateLocationDto = z.infer<typeof createLocationSchema>;
export type UpdateLocationDto = z.infer<typeof updateLocationSchema>;
