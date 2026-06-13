import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  tripId?: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
