import { z } from 'zod';

export const createVehicleTypeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  description: z.string().optional(),
  payloadKg: z.number().positive().optional(),
  volumeM3: z.number().positive().optional(),
  lengthM: z.number().positive().optional(),
  widthM: z.number().positive().optional(),
  heightM: z.number().positive().optional(),
  loadingMeters: z.number().positive().optional(),
  palletCapacity: z.number().int().positive().optional(),
  axleConfiguration: z.string().optional(),
  isAdrCapable: z.boolean().default(false),
  isTemperatureControlled: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateVehicleTypeSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  payloadKg: z.number().positive().optional(),
  volumeM3: z.number().positive().optional(),
  lengthM: z.number().positive().optional(),
  widthM: z.number().positive().optional(),
  heightM: z.number().positive().optional(),
  loadingMeters: z.number().positive().optional(),
  palletCapacity: z.number().int().positive().optional(),
  axleConfiguration: z.string().optional(),
  isAdrCapable: z.boolean().optional(),
  isTemperatureControlled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CreateVehicleTypeDto = z.infer<typeof createVehicleTypeSchema>;
export type UpdateVehicleTypeDto = z.infer<typeof updateVehicleTypeSchema>;
