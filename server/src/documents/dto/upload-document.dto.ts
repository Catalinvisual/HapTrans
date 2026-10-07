import { IsString, IsOptional } from 'class-validator';

export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  tripId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;
}
