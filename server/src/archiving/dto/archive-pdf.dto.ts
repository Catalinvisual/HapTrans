import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class ArchivePdfDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sourceType: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  sourceId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  sourceReference?: string;

  @IsString()
  @IsOptional()
  pdfBase64?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  filename?: string;
}

export class AckArchiveJobDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  committedFilename?: string;

  @IsOptional()
  bytes?: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsOptional()
  retryable?: boolean;
}
