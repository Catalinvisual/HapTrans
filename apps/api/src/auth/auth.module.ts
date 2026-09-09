import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { PasswordService } from './password/password.service';
import { SessionService } from './session/session.service';
import { EmailVerificationService } from './email/email-verification.service';
import { MfaService } from './mfa/mfa.service';
import { AbilityFactory } from './ability/ability-factory.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: (config.get<string>('JWT_ACCESS_EXPIRY') || '15m') as any },
      }),
    }),
  ],
  providers: [
    AuthService,
    PasswordService,
    SessionService,
    EmailVerificationService,
    MfaService,
    AbilityFactory,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    { provide: 'JWT_ACCESS_GUARD', useClass: JwtAuthGuard },
    { provide: 'ROLES_GUARD', useClass: RolesGuard },
    { provide: 'PERMISSIONS_GUARD', useClass: PermissionsGuard },
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    PasswordService,
    SessionService,
    EmailVerificationService,
    MfaService,
    AbilityFactory,
    'JWT_ACCESS_GUARD',
    'ROLES_GUARD',
    'PERMISSIONS_GUARD',
  ],
})
export class AuthModule {}
