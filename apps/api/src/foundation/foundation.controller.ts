import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  moneyFromDecimal,
  add,
  toDto,
  formatCurrency,
  formatDateTime,
  LOCALE_META,
} from '@hapcargo/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MoneyDemoService } from './money-demo.service';

const echoSchema = z.object({
  message: z.string().min(1).max(500),
  count: z.number().int().min(0).optional(),
});

/**
 * Foundation endpoints used ONLY to validate the TASK 03 infrastructure
 * (routing, validation, error handling, shared-package wiring). No business
 * logic is implemented here.
 */
@ApiTags('foundation')
@Controller('foundation')
export class FoundationController {
  constructor(private readonly moneyDemo: MoneyDemoService) {}

  @Get('health')
  health(): { ok: true } {
    return { ok: true };
  }

  @Post('echo')
  echo(@Body(new ZodValidationPipe(echoSchema)) body: z.infer<typeof echoSchema>) {
    return { message: body.message, count: body.count ?? 0 };
  }

  @Get('locales')
  locales() {
    return LOCALE_META;
  }

  @Get('money-demo')
  moneyDemoHandler() {
    const a = moneyFromDecimal('120.50', 'EUR');
    const b = moneyFromDecimal('29.90', 'EUR');
    const sum = add(a, b);
    return {
      a: toDto(a),
      b: toDto(b),
      sum: toDto(sum),
      formatted: formatCurrency(toDto(sum).amount, 'EUR', 'en'),
      now: formatDateTime(new Date().toISOString(), 'en', 'UTC'),
      line: this.moneyDemo.computeLine('12.5', '4', '19'),
    };
  }
}
