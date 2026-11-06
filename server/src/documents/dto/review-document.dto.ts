import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocumentReviewStatus } from '../document.entity';

export class ReviewDocumentDto {
  @IsIn([DocumentReviewStatus.APPROVED, DocumentReviewStatus.REJECTED])
  status: DocumentReviewStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}