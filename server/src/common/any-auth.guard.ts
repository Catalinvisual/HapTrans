import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Accepts an office (TMS) token or a client-portal token.
 *
 * A few read routes are shared by both audiences — an order's documents are
 * fetched by the TMS drawer and by the client portal drawer. The route used to
 * be fully public; this guard keeps both callers working while refusing
 * anonymous access. Ownership is still enforced by the service.
 */
@Injectable()
export class AnyAuthGuard extends AuthGuard(['jwt', 'portal-jwt']) {}
