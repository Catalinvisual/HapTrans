import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<{ action: string; subject: string }[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user?.id) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const permissions: { action: string; subject: string }[] = [];
    const seen = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.permissions) {
        const key = `${rp.permission.action}:${rp.permission.subject}`;
        if (!seen.has(key)) {
          seen.add(key);
          permissions.push({ action: rp.permission.action, subject: rp.permission.subject });
        }
      }
    }

    const allowed = required.every(({ action, subject }) => permissions.some((p) => p.action === action && p.subject === subject));
    if (!allowed) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient permissions' });

    return true;
  }
}
