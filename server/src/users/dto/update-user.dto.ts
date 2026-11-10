import { IsString, IsEmail, IsOptional, IsEnum, IsArray, IsBoolean, IsIn } from 'class-validator';
import { UserRole } from '../user.entity';
import { SUPPORTED_LANGUAGES } from './create-user.dto';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  grossSalary?: number;

  @IsOptional()
  dailyRate?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedPages?: string[];

  @IsOptional()
  @IsIn(SUPPORTED_LANGUAGES)
  language?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
