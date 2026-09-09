import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

/**
 * Zod validation pipe (ADR-009 / TASK 03 §15).
 * Applied at the API boundary: `@Body(new ZodValidationPipe(schema))`.
 * Server-side validation is authoritative; client-side validation is never trusted.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodTypeAny) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: result.error.issues.map((i) => ({
          field: i.path.join('.') || undefined,
          message: i.message,
          code: i.code,
        })),
      });
    }
    return result.data;
  }
}
