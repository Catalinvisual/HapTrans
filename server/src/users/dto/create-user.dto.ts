import { IsArray, IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../user.entity';

export const SUPPORTED_LANGUAGES = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'] as const;

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsIn(SUPPORTED_LANGUAGES)
  language?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedPages?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
