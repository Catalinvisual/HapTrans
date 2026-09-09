import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
    const refreshToken = this.generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const session = await this.prisma.userSession.create({
      data: {
        userId,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });
    return session.refreshToken;
  }

  async validateSession(token: string): Promise<{ id: string; userId: string } | null> {
    const session = await this.prisma.userSession.findFirst({
      where: { refreshToken: token, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true },
    });
    return session;
  }

  async touchSession(sessionId: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { lastUsedAt: new Date() },
    });
  }

  async revokeSessionByToken(token: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { refreshToken: token },
      data: { revokedAt: new Date() },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
  }

  async getUserSessions(userId: string): Promise<{ id: string; deviceName: string | null; ipAddress: string | null; userAgent: string | null; lastUsedAt: Date; createdAt: Date }[]> {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, deviceName: true, ipAddress: true, userAgent: true, lastUsedAt: true, createdAt: true },
      orderBy: { lastUsedAt: 'desc' },
    });
    return sessions;
  }

  private generateToken(): string {
    return crypto.randomBytes(48).toString('hex');
  }
}
