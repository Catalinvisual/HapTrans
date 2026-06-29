import { IsString, IsOptional, IsDateString, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { TripStatus } from '../trip.entity';

export class CreateTripDto {
  @IsOptional()
  @IsString()
  referenceNumber: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  truckId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  pickupCountry: string;

  @IsOptional()
  @IsString()
  pickupAddress: string;

  @IsOptional()
  @IsString()
  dropoffCountry: string;

  @IsOptional()
  @IsString()
  dropoffAddress: string;

  @IsOptional()
  @IsDateString()
  pickupDate: string;

  @IsOptional()
  @IsString()
  pickupTime: string;

  @IsOptional()
  @IsDateString()
  dropoffDate: string;

  @IsOptional()
  @IsString()
  dropoffTime: string;

  @IsOptional()
  @IsString()
  appointmentFrom?: string;

  @IsOptional()
  @IsString()
  appointmentTo?: string;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  pallets?: number;

  @IsOptional()
  @IsString()
  cargoDetails?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  agreedPrice?: number;

  @IsOptional()
  @IsNumber()
  fuelSurchargePercent?: number;

  @IsOptional()
  @IsNumber()
  tollCosts?: number;

  @IsOptional()
  @IsNumber()
  extraCosts?: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  estimatedCost?: number;

  @IsOptional()
  @IsNumber()
  realCost?: number;

  @IsOptional()
  @IsString()
  clientRateId?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  pickupCompanyName?: string;

  @IsOptional()
  @IsString()
  dropoffCompanyName?: string;

  @IsOptional()
  @IsString()
  palletType?: string;

  @IsOptional()
  @IsString()
  loadingReference?: string;

  @IsOptional()
  @IsString()
  unloadingReference?: string;

  @IsOptional()
  @IsString()
  cmrReference?: string;

  @IsOptional()
  @IsNumber()
  estimatedLoadingMinutes?: number;

  @IsOptional()
  @IsNumber()
  manualDelayMinutes?: number;

  @IsOptional()
  @IsBoolean()
  tollIncluded?: boolean;

  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @IsBoolean()
  etaUpdateSent?: boolean;

  @IsOptional()
  @IsBoolean()
  adrSurcharge?: boolean;

  @IsOptional()
  @IsBoolean()
  nightSurcharge?: boolean;

  @IsOptional()
  @IsBoolean()
  weekendSurcharge?: boolean;

  @IsOptional()
  @IsBoolean()
  holidaySurcharge?: boolean;

  @IsOptional()
  company?: any;
}
