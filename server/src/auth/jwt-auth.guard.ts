import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { hasPageAccess, isSelfUserRequest, requiredPageForRequest } from '../common/page-access';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);
    if (!authenticated) return false;

    const request = context.switchToHttp().getRequest();
    const path = request.path || String(request.originalUrl || '').split('?')[0];
    const page = requiredPageForRequest(path);
    if (page && !isSelfUserRequest(request.user, request.method, path) && !hasPageAccess(request.user, page)) {
      throw new ForbiddenException('You do not have access to this page.');
    }
    return true;
  }
}
