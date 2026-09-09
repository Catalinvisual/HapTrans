import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MfaService {
  constructor(private readonly prisma: PrismaService) {}

  async setupMfa(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const secret = speakeasy.generateSecret({ name: `HAP CARGO (${userId})`, length: 20 });
    await this.prisma.mfaSecret.upsert({
      where: { userId },
      update: { secret: secret.base32, isEnabled: false },
      create: { userId, secret: secret.base32, isEnabled: false },
    });
    return { secret: secret.base32, otpauthUrl: secret.otpauth_url ?? '' };
  }

  async verifyAndEnableMfa(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const mfa = await this.prisma.mfaSecret.findUnique({ where: { userId } });
    if (!mfa) throw new NotFoundException('MFA not setup');

    const verified = speakeasy.totp.verify({ secret: mfa.secret, encoding: 'base32', token: code, window: 2 });
    if (!verified) throw new BadRequestException('Invalid MFA code');

    const backupCodes = Array.from({ length: 10 }, () =>
      Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join(''),
    );

    await this.prisma.mfaSecret.update({
      where: { userId },
      data: { isEnabled: true, backupCodes },
    });
    return { backupCodes };
  }

  async disableMfa(userId: string, code: string): Promise<void> {
    const mfa = await this.prisma.mfaSecret.findUnique({ where: { userId } });
    if (!mfa || !mfa.isEnabled) throw new NotFoundException('MFA not enabled');

    const verified = speakeasy.totp.verify({ secret: mfa.secret, encoding: 'base32', token: code, window: 2 });
    if (!verified) throw new BadRequestException('Invalid MFA code');

    await this.prisma.mfaSecret.update({
      where: { userId },
      data: { isEnabled: false, backupCodes: undefined },
    });
  }

  async isMfaEnabled(userId: string): Promise<boolean> {
    const mfa = await this.prisma.mfaSecret.findUnique({ where: { userId } });
    return !!mfa?.isEnabled;
  }

  async verifyMfaCode(userId: string, code: string): Promise<boolean> {
    const mfa = await this.prisma.mfaSecret.findUnique({ where: { userId } });
    if (!mfa || !mfa.isEnabled) return true;
    return speakeasy.totp.verify({ secret: mfa.secret, encoding: 'base32', token: code, window: 2 });
  }
}
