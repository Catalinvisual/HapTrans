import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });

    const userRoles = user.roles ?? [];
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRole) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient role' });

    return true;
  }
}
