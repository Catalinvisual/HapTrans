import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EmailVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async requestVerification(userId: string): Promise<void> {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.emailVerificationToken.upsert({
      where: { userId },
      update: { token, expiresAt, usedAt: null },
      create: { userId, token, expiresAt },
    });
    // Email sending abstraction - to be implemented with email provider
    console.log(`[DEV] Email verification token for user ${userId}: ${token}`);
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new Error('Invalid or expired verification token');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  private generateToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
  }
}
