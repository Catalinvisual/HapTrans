import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  hasPageAccess,
  isDriverAllowedPath,
  isDriverRole,
  isSelfUserRequest,
  requiredPageForRequest,
} from '../common/page-access';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);
    if (!authenticated) return false;

    const request = context.switchToHttp().getRequest();
    const path = request.path || String(request.originalUrl || '').split('?')[0];

    // Driver accounts are limited to the driver app surface. The check runs
    // before page permissions so a driver can never be granted an office
    // module by mistake (or by self-signup).
    if (isDriverRole(request.user) && !isDriverAllowedPath(path)) {
      throw new ForbiddenException('This area is not available for driver accounts.');
    }

    const page = requiredPageForRequest(path);
    if (page && !isSelfUserRequest(request.user, request.method, path) && !hasPageAccess(request.user, page)) {
      throw new ForbiddenException('You do not have access to this page.');
    }
    return true;
  }
}
