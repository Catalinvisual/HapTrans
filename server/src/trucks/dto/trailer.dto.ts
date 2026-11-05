import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrailerStatus, TrailerType } from '../trailer.entity';

export class CreateTrailerDto {
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @IsOptional()
  @IsEnum(TrailerType)
  type?: TrailerType;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  payloadCapacityWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxWeightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxLdm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxVolumeCbm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  payloadCapacityPallets?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  heightCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  widthCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lengthCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  axleCount?: number;

  @IsOptional()
  @IsEnum(TrailerStatus)
  status?: TrailerStatus;

  @IsOptional()
  @IsDateString()
  apkExpiry?: string | null;
}

export class UpdateTrailerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  plateNumber?: string;

  @IsOptional()
  @IsEnum(TrailerType)
  type?: TrailerType;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  payloadCapacityWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxWeightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxLdm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxVolumeCbm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  payloadCapacityPallets?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  heightCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  widthCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lengthCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  axleCount?: number;

  @IsOptional()
  @IsEnum(TrailerStatus)
  status?: TrailerStatus;

  @IsOptional()
  @IsDateString()
  apkExpiry?: string | null;
}
