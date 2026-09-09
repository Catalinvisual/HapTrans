import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SessionService } from '../session/session.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Missing access token' });

    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { sub: string; email: string };
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.status === 'DISABLED' || user.status === 'LOCKED') {
        throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'User is not active' });
      }
      req.user = { id: user.id, email: user.email };
      return true;
    } catch {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Invalid or expired token' });
    }
  }

  private extractToken(req: any): string | undefined {
    const cookie = req?.cookies?.access_token;
    if (cookie) return cookie;
    const auth = req?.headers?.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return undefined;
  }
}
