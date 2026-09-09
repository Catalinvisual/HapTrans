import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZodError } from 'zod';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from './request-id.middleware';

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: { field?: string; message: string; code?: string }[];
  requestId?: string;
}

/**
 * Unified API error model (architecture §14).
 * Every error becomes { statusCode, code, message, details?, requestId }.
 * In production, internal stack traces and implementation details are never
 * exposed to end users.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId =
      (request.headers[REQUEST_ID_HEADER] as string | undefined) ??
      (response.locals.requestId as string | undefined);

    let body: ErrorBody;

    if (exception instanceof ZodError) {
      body = {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: exception.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
          code: i.code,
        })),
      };
    } else if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      let code = 'HTTP_ERROR';
      let message = exception.message;
      let details: ErrorBody['details'];
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const obj = res as Record<string, unknown>;
        if (typeof obj.code === 'string') code = obj.code;
        if (typeof obj.message === 'string') message = obj.message;
        if (Array.isArray(obj.details)) {
          details = (obj.details as unknown[]).map((d) => {
            const o = d && typeof d === 'object' ? (d as Record<string, unknown>) : {};
            const item: { field?: string; message: string; code?: string } = {
              message: typeof o.message === 'string' ? o.message : String(d),
            };
            if (typeof o.field === 'string') item.field = o.field;
            if (typeof o.code === 'string') item.code = o.code;
            return item;
          });
        } else if (Array.isArray(obj.message)) {
          details = (obj.message as unknown[]).map((m) => ({
            message: String(m),
          }));
        }
      }
      body = { statusCode: status, code, message, details };
    } else {
      // Unexpected/internal error (including Prisma + Redis + storage errors).
      const isProd = process.env.NODE_ENV === 'production';
      if (exception instanceof Error) {
        this.logger.error(exception.message, exception.stack);
      } else {
        this.logger.error('Unknown error', String(exception));
      }
      body = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_ERROR',
        message: isProd ? 'An unexpected error occurred.' : 'An unexpected error occurred.',
      };
    }

    if (requestId) body.requestId = requestId;
    response.status(body.statusCode).json({ error: body });
  }
}
