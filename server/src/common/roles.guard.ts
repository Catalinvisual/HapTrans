import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../users/user.entity';

/**
 * Role-based access guard used by the analytics & reporting modules.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(UserRole.ADMIN)                    // admin only
 *   @Roles(UserRole.ADMIN, UserRole.DISPATCHER) // admin + dispatcher
 *
 * The guard reads metadata from the handler (or class). If no @Roles metadata
 * is present the request is allowed (the JwtAuthGuard still enforces auth).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as { role?: UserRole } | undefined;
    if (!user || !user.role || !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions for this operation');
    }
    return true;
  }
}