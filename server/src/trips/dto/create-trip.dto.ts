import { IsString, IsOptional, IsDateString, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { TripStatus } from '../trip.entity';

export class CreateTripDto {
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

  @IsString()
  pickupCountry: string;

  @IsString()
  pickupAddress: string;

  @IsString()
  dropoffCountry: string;

  @IsString()
  dropoffAddress: string;

  @IsDateString()
  pickupDate: string;

  @IsString()
  pickupTime: string;

  @IsDateString()
  dropoffDate: string;

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
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @IsBoolean()
  etaUpdateSent?: boolean;
}
