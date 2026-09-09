import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Ensures every request has a correlation/request ID and echoes it back on the
 * response so clients can correlate logs, errors and downstream events.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const requestId =
      (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
    res.setHeader(REQUEST_ID_HEADER, requestId);
    // Make it available to logs/error responses.
    res.locals.requestId = requestId;
    next();
  }
}
