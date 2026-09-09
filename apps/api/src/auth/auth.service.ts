import { Injectable, UnauthorizedException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from './password/password.service';
import { SessionService } from './session/session.service';
import { EmailVerificationService } from './email/email-verification.service';
import { MfaService } from './mfa/mfa.service';
import { ConfigService } from '@nestjs/config';
import type { LoginDto, RegisterDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, MfaVerifyDto, MfaDisableDto } from './dto/auth.dto';
import type { User } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  emailVerified: boolean;
  companies: CompanyContext[];
  roles: RoleContext[];
  permissions: PermissionContext[];
}

export interface CompanyContext {
  id: string;
  name: string;
  code: string;
  timezone: string;
  locale: string;
  currency: string;
  branchId: string | null;
  branchName: string | null;
  isPrimary: boolean;
}

export interface RoleContext {
  id: string;
  name: string;
  companyId: string | null;
  scope: string;
}

export interface PermissionContext {
  action: string;
  subject: string;
  scope: string;
  conditions: Record<string, unknown> | null;
}

export interface SessionInfo {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastUsedAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly mfaService: MfaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return null;
    if (user.status === 'DISABLED' || user.status === 'LOCKED') return null;
    if (user.lockedUntil && user.lockedUntil > new Date()) return null;

    const valid = await this.passwordService.verify(password, user.passwordHash);
    if (!valid) {
      await this.handleFailedLogin(user.id);
      return null;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    return user;
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });

    if (dto.mfaCode) {
      return this.loginWithMfa(user, dto.mfaCode, ipAddress, userAgent);
    }

    const mfaRequired = await this.mfaService.isMfaEnabled(user.id);
    if (mfaRequired) {
      throw new UnauthorizedException({ code: 'MFA_REQUIRED', message: 'MFA code is required' });
    }

    const authUser = await this.buildAuthUser(user.id);
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.sessionService.createSession(user.id, ipAddress, userAgent);

    return { accessToken, refreshToken, user: authUser };
  }

  async loginWithMfa(user: User, mfaCode: string, ipAddress?: string, userAgent?: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    const valid = await this.mfaService.verifyMfaCode(user.id, mfaCode);
    if (!valid) {
      await this.handleFailedLogin(user.id);
      throw new UnauthorizedException({ code: 'MFA_INVALID', message: 'Invalid MFA code' });
    }

    const authUser = await this.buildAuthUser(user.id);
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.sessionService.createSession(user.id, ipAddress, userAgent);

    return { accessToken, refreshToken, user: authUser };
  }

  async refreshSession(refreshToken: string): Promise<{ accessToken: string; user: AuthUser } | null> {
    const session = await this.sessionService.validateSession(refreshToken);
    if (!session) return null;

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status === 'DISABLED' || user.status === 'LOCKED') return null;

    const authUser = await this.buildAuthUser(user.id);
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    await this.sessionService.touchSession(session.id);
    return { accessToken, user: authUser };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.sessionService.revokeSessionByToken(refreshToken);
    } else {
      await this.sessionService.revokeAllSessions(userId);
    }
  }

  async me(userId: string): Promise<AuthUser> {
    return this.buildAuthUser(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await this.passwordService.verify(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException({ code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' });

    const newHash = await this.passwordService.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash, updatedAt: new Date() } });
  }

  async register(dto: RegisterDto): Promise<{ id: string; email: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already exists');

    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: 'ACTIVE',
      },
    });

    const company = await this.prisma.company.upsert({
      where: { code: dto.companyName.toUpperCase().replace(/\s+/g, '_').slice(0, 20) },
      update: {},
      create: { name: dto.companyName, code: dto.companyName.toUpperCase().replace(/\s+/g, '_').slice(0, 20) },
    });

    await this.prisma.companyUser.create({
      data: { userId: user.id, companyId: company.id, isPrimary: true },
    });

    return { id: user.id, email: user.email };
  }

  async requestPasswordReset(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) return;

    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });
    console.log(`[DEV] Password reset token for ${user.email}: ${token}`);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { token: dto.token } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' });
    }

    const newHash = await this.passwordService.hash(dto.password);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash: newHash, updatedAt: new Date() } }),
      this.prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    ]);
  }

  async setupMfa(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    return this.mfaService.setupMfa(userId);
  }

  async verifyMfaSetup(userId: string, dto: MfaVerifyDto): Promise<{ backupCodes: string[] }> {
    return this.mfaService.verifyAndEnableMfa(userId, dto.code);
  }

  async disableMfa(userId: string, dto: MfaDisableDto): Promise<void> {
    await this.mfaService.disableMfa(userId, dto.code);
  }

  async requestEmailVerification(userId: string): Promise<void> {
    await this.emailVerificationService.requestVerification(userId);
  }

  async verifyEmail(token: string): Promise<void> {
    await this.emailVerificationService.verifyEmail(token);
  }

  async getSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await this.sessionService.getUserSessions(userId);
    return sessions.map((s) => ({ ...s, isCurrent: false }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.sessionService.revokeSession(userId, sessionId);
  }

  private async buildAuthUser(userId: string): Promise<AuthUser> {
    const [user, companyUsers, userRoles] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.companyUser.findMany({
        where: { userId },
        include: { company: true, branch: { select: { id: true, name: true } } },
      }),
      this.prisma.userRole.findMany({
        where: { userId },
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      }),
    ]);

    if (!user) throw new NotFoundException('User not found');

    const companies: CompanyContext[] = companyUsers.map((cu) => ({
      id: cu.company.id,
      name: cu.company.name,
      code: cu.company.code,
      timezone: cu.company.timezone,
      locale: cu.company.locale,
      currency: cu.company.currency,
      branchId: cu.branchId,
      branchName: cu.branch?.name ?? null,
      isPrimary: cu.isPrimary,
    }));

    const roles: RoleContext[] = userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      companyId: ur.role.companyId,
      scope: 'company',
    }));

    const permissions: PermissionContext[] = [];
    const seen = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.permissions) {
        const key = `${rp.permission.action}:${rp.permission.subject}`;
        if (!seen.has(key)) {
          seen.add(key);
          permissions.push({
            action: rp.permission.action,
            subject: rp.permission.subject,
            scope: rp.scope,
            conditions: rp.conditions as Record<string, unknown> | null,
          });
        }
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      emailVerified: user.emailVerified,
      companies,
      roles,
      permissions,
    };
  }

  private async handleFailedLogin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const newCount = user.failedLoginCount + 1;
    const lockUntil = newCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: newCount, lockedUntil: lockUntil },
    });
  }

  private generateSecureToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}
