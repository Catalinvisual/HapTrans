import { Controller, Post, Body, Get, UseGuards, Request, Response, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../users/user.entity';

class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsOptional() rememberMe?: boolean;
}

class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() name: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() grossSalary?: number;
  @IsOptional() dailyRate?: number;
  @IsOptional() allowedPages?: string[];
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Request() req: any, @Response() res: any) {
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ip = req.ip || req.connection.remoteAddress;

    const result = await this.authService.login(dto.email, dto.password, userAgent, ip);
    
    // Set HttpOnly Cookie for Refresh Token
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true if https
      sameSite: 'lax', // Protect against CSRF but allow normal navigation
      expires: result.expiresAt,
    });

    return res.json({
      access_token: result.accessToken,
      user: result.user
    });
  }

  @Post('refresh')
  async refresh(@Request() req: any, @Response() res: any) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ip = req.ip || req.connection.remoteAddress;

    try {
      const result = await this.authService.refreshToken(refreshToken, userAgent, ip);

      // Set NEW HttpOnly Cookie (Token Rotation)
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: result.expiresAt,
      });

      return res.json({
        access_token: result.accessToken,
        user: result.user
      });
    } catch (e: any) {
      // Clear cookie if refresh fails
      res.clearCookie('refresh_token');
      return res.status(401).json({ message: e.message || 'Invalid refresh token' });
    }
  }

  @Post('logout')
  async logout(@Request() req: any, @Response() res: any) {
    const refreshToken = req.cookies['refresh_token'];
    if (refreshToken && refreshToken.includes('.')) {
      const [sessionId] = refreshToken.split('.');
      await this.authService.revokeSession(sessionId, 'User Logout');
    }
    res.clearCookie('refresh_token');
    return res.json({ success: true });
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@Request() req: any, @Response() res: any) {
    await this.authService.revokeAllSessions(req.user.id, 'User Triggered Logout All');
    res.clearCookie('refresh_token');
    return res.json({ success: true });
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
  async changePassword(@Request() req: any, @Response() res: any, @Body() dto: any) {
    await this.authService.changePassword(req.user.id, dto.oldPassword, dto.newPassword);
    // User must login again since all sessions revoked
    res.clearCookie('refresh_token');
    return res.json({ success: true });
  }

  @Post('fcm-token')
  @UseGuards(JwtAuthGuard)
  async saveFcmToken(@Request() req: any, @Body() body: { fcmToken: string }) {
    const logger = new Logger('FCMToken');
    logger.log(`Saving FCM token for user ${req.user.id}: ${body.fcmToken?.substring(0, 20)}...`);
    await this.authService.saveFcmToken(req.user.id, body.fcmToken);
    return { success: true };
  }

  @Get('app-version')
  getAppVersion() {
    return {
      versionCode: 8,
      url: 'https://haptrans-production.up.railway.app/uploads/HapTrans-v8.apk',
      mandatory: false,
      message: {
        ro: 'O nouă versiune a aplicației este disponibilă! Vă rugăm să actualizați.',
        en: 'A new version of the app is available! Please update.',
        nl: 'Er is een nieuwe versie van de app beschikbaar! Werk deze alstublieft bij.',
        de: 'Eine neue Version der App ist verfügbar! Bitte aktualisieren Sie.',
        fr: 'Une nouvelle version de l\'application est disponible ! Veuillez la mettre à jour.'
      }
    };
  }
}
