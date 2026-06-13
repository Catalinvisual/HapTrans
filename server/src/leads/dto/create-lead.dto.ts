import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { LeadStatus } from '../lead.entity';

export class CreateLeadDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsString()
  weight: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;
}
