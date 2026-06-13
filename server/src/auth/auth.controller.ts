import { Controller, Post, Body, Get, UseGuards, Request, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../users/user.entity';

class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() name: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() grossSalary?: number;
  @IsOptional() dailyRate?: number;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req: any) {
    return req.user;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Request() req: any, @Body() dto: any) {
    return this.authService.changePassword(req.user.id, dto.oldPassword, dto.newPassword);
  }

  @Post('fcm-token')
  @UseGuards(JwtAuthGuard)
  async saveFcmToken(@Request() req: any, @Body() body: { fcmToken: string }) {
    const logger = new Logger('FCMToken');
    logger.log(`Saving FCM token for user ${req.user.id}: ${body.fcmToken?.substring(0, 20)}...`);
    await this.authService.saveFcmToken(req.user.id, body.fcmToken);
    return { success: true };
  }


}
