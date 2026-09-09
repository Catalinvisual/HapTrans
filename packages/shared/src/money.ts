/**
 * Money — deterministic fixed-point monetary arithmetic (ADR-022).
 *
 * Amounts are represented as integer minor units (e.g. cents for a 2-digit
 * currency) using an exact integer representation. All arithmetic happens in
 * integer space to avoid IEEE-754 floating point drift. Financial results are
 * therefore deterministic and auditable.
 *
 * Rounding behaviour:
 * - Intermediate results are rounded to the currency's minor-unit scale using
 *   "half up" (ROUND_HALF_UP) by default.
 * - Rounding never happens implicitly for add/subtract (these are exact).
 * - Multiplication/percentage always rounds to the minor-unit scale.
 */
import { z } from 'zod';

export type CurrencyCode = string; // ISO 4217, e.g. 'EUR', 'RON', 'USD'

/** Minor-unit scale per ISO 4217 currency. Override for exotic currencies. */
const DEFAULT_SCALE = 2;

export function minorUnitScale(currency: CurrencyCode): number {
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(`Invalid ISO 4217 currency code: "${currency}"`);
  }
  // Common currencies all use 2 minor units. Extend map for 0/3-scale currencies
  // (e.g. JPY=0, BHD=3) as needed.
  return DEFAULT_SCALE;
}

export type RoundingMode = 'half-up' | 'ceil' | 'floor';

const TEN = 10n;

function powerOfTen(scale: number): bigint {
  return TEN ** BigInt(scale);
}

function roundDiv(numerator: bigint, divisor: bigint, mode: RoundingMode): bigint {
  const sign = numerator < 0n ? -1n : 1n;
  const abs = numerator < 0n ? -numerator : numerator;
  const q = abs / divisor;
  const r = abs % divisor;
  if (r === 0n) return numerator / divisor;
  let rounded: bigint;
  switch (mode) {
    case 'ceil':
      rounded = q + 1n;
      break;
    case 'floor':
      rounded = q;
      break;
    case 'half-up':
      rounded = r * 2n >= divisor ? q + 1n : q;
      break;
  }
  return rounded * BigInt(sign);
}

export interface Money {
  readonly minorUnits: bigint;
  readonly currency: CurrencyCode;
}

/** Serialized wire/DB representation: amount-as-decimal-string + currency. */
export interface MoneyDto {
  amount: string; // decimal string, e.g. "1234.56"
  currency: CurrencyCode;
}

function toMinorUnits(amount: string, currency: CurrencyCode): bigint {
  const scale = minorUnitScale(currency);
  // Parse a decimal string exactly into integer minor units.
  const s = amount.trim();
  const neg = s.startsWith('-');
  const clean = neg ? s.slice(1) : s;
  const [intPart = '0', fracPart = '0'] = clean.split('.');
  const frac = (fracPart + '0'.repeat(scale)).slice(0, scale);
  const intAndFracDigits = `${intPart}${frac}`;
  const stripped = intAndFracDigits.replace(/^0+(?=\d)/, '');
  const asBig = stripped === '' ? 0n : BigInt(stripped);
  return neg ? -asBig : asBig;
}

export function minorUnitsOf(amount: string, currency: CurrencyCode): bigint {
  return toMinorUnits(amount, currency);
}

export function moneyFromMinorUnits(minorUnits: bigint | number | string, currency: CurrencyCode): Money {
  return { minorUnits: typeof minorUnits === 'bigint' ? minorUnits : BigInt(minorUnits), currency };
}

export function moneyFromDecimal(amount: string, currency: CurrencyCode): Money {
  if (!/^-?\d*(\.\d+)?$/.test(amount)) {
    throw new Error(`Invalid decimal amount: "${amount}"`);
  }
  return { minorUnits: toMinorUnits(amount, currency), currency };
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { minorUnits: a.minorUnits + b.minorUnits, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { minorUnits: a.minorUnits - b.minorUnits, currency: a.currency };
}

export function negate(a: Money): Money {
  return { minorUnits: -a.minorUnits, currency: a.currency };
}

export function isZero(a: Money): boolean {
  return a.minorUnits === 0n;
}

export function isNegative(a: Money): boolean {
  return a.minorUnits < 0n;
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.minorUnits < b.minorUnits) return -1;
  if (a.minorUnits > b.minorUnits) return 1;
  return 0;
}

export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.minorUnits === b.minorUnits;
}

/**
 * Multiply a monetary amount by a scalar quantity, rounding to minor units.
 * `quantity` is a decimal string (e.g. "3.5") for deterministic parsing.
 */
export function multiply(a: Money, quantity: string, mode: RoundingMode = 'half-up'): Money {
  const scale = minorUnitScale(a.currency);
  const qScale = toMinorUnits(quantity, a.currency);
  const product = a.minorUnits * qScale;
  const result = roundDiv(product, powerOfTen(scale), mode);
  return { minorUnits: result, currency: a.currency };
}

/** Apply a percentage (0-100) to a monetary amount, rounding deterministically. */
export function percentage(a: Money, percent: string, mode: RoundingMode = 'half-up'): Money {
  const scale = minorUnitScale(a.currency);
  const pMinor = toMinorUnits(percent, a.currency); // percent * 10^scale
  // a.minorUnits * (pMinor / 10^scale) / 100
  const numerator = a.minorUnits * pMinor;
  const denominator = powerOfTen(scale) * 100n;
  const result = roundDiv(numerator, denominator, mode);
  return { minorUnits: result, currency: a.currency };
}

/** Format to a decimal string with the currency's minor-unit scale. */
export function toDecimalString(a: Money): string {
  const scale = minorUnitScale(a.currency);
  const neg = a.minorUnits < 0n;
  const abs = neg ? -a.minorUnits : a.minorUnits;
  const factor = powerOfTen(scale);
  const whole = abs / factor;
  const frac = abs % factor;
  const fracStr = frac.toString().padStart(scale, '0');
  return `${neg ? '-' : ''}${whole}.${fracStr}`;
}

export function toString(a: Money): string {
  return `${toDecimalString(a)} ${a.currency}`;
}

export function toDto(a: Money): MoneyDto {
  return { amount: toDecimalString(a), currency: a.currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

/** Zod schema for a Money DTO (wire format). */
export const moneyDtoSchema = z.object({
  amount: z.string().regex(/^-?\d*(\.\d+)?$/, 'Invalid decimal amount'),
  currency: z.string().min(3).max(3).toUpperCase(),
});

export type MoneySchema = z.infer<typeof moneyDtoSchema>;
