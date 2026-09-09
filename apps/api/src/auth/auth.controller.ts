import { Body, Controller, Get, HttpCode, Post, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { loginSchema, registerSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, mfaVerifySchema, mfaDisableSchema } from './dto/auth.dto';
import type { LoginDto, RegisterDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, MfaVerifyDto, MfaDisableDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or MFA required' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginDto,
    @Request() req: any,
  ) {
    const ipAddress = req.ip ?? req.connection?.remoteAddress;
    const userAgent = req.headers?.['user-agent'];
    return this.auth.login(body, ipAddress, userAgent);
  }

  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new user (dev only)' })
  @ApiResponse({ status: 201, description: 'User created' })
  async register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Logout (revoke session)' })
  @ApiBearerAuth()
  async logout(@CurrentUser() user: any, @Body('refreshToken') refreshToken?: string) {
    await this.auth.logout(user.id, refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth()
  async me(@CurrentUser() user: any) {
    return this.auth.me(user.id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBearerAuth()
  async changePassword(@CurrentUser() user: any, @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordDto) {
    await this.auth.changePassword(user.id, body);
  }

  @Post('forgot-password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Request password reset' })
  async forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordDto) {
    await this.auth.requestPasswordReset(body);
  }

  @Post('reset-password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordDto) {
    await this.auth.resetPassword(body);
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Setup MFA (returns secret and otpauth URL)' })
  @ApiBearerAuth()
  async setupMfa(@CurrentUser() user: any) {
    return this.auth.setupMfa(user.id);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verify and enable MFA' })
  @ApiBearerAuth()
  async verifyMfa(@CurrentUser() user: any, @Body(new ZodValidationPipe(mfaVerifySchema)) body: MfaVerifyDto) {
    return this.auth.verifyMfaSetup(user.id, body);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Disable MFA' })
  @ApiBearerAuth()
  async disableMfa(@CurrentUser() user: any, @Body(new ZodValidationPipe(mfaDisableSchema)) body: MfaDisableDto) {
    await this.auth.disableMfa(user.id, body);
  }

  @Post('email/verify-request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Request email verification' })
  @ApiBearerAuth()
  async requestEmailVerification(@CurrentUser() user: any) {
    await this.auth.requestEmailVerification(user.id);
  }

  @Post('email/verify')
  @HttpCode(204)
  @ApiOperation({ summary: 'Verify email with token' })
  async verifyEmail(@Query('token') token: string) {
    if (!token) throw new BadRequestException('Token is required');
    await this.auth.verifyEmail(token);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List active sessions' })
  @ApiBearerAuth()
  async sessions(@CurrentUser() user: any) {
    return this.auth.getSessions(user.id);
  }

  @Post('sessions/:id/revoke')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke a session' })
  @ApiBearerAuth()
  async revokeSession(@CurrentUser() user: any, @Query('id') sessionId: string) {
    await this.auth.revokeSession(user.id, sessionId);
  }
}
