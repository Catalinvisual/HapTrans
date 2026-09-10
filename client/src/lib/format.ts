import i18n from './i18n';

/**
 * Global locale-aware number formatting for HapCargo.
 *
 * Values are always stored as raw numbers in the DB; formatting happens
 * ONLY at display time using the user's selected UI language:
 *   ro/nl/de -> 1.234,56   |  fr -> 1 234,56  |  en -> 1,234.56
 * Currency placement follows the locale automatically (€ 1.234,56 / 1 234,56 € / €1,234.56).
 */

export function appLocale(): string {
  const lng = (i18n.language || 'en').toLowerCase();
  if (lng.startsWith('ro')) return 'ro-RO';
  if (lng.startsWith('nl')) return 'nl-NL';
  if (lng.startsWith('de')) return 'de-DE';
  if (lng.startsWith('fr')) return 'fr-FR';
  return 'en-GB';
}

function safeNum(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Generic localized number. */
export function fmtNumber(value: any, decimals = 0): string {
  const n = safeNum(value);
  if (n === null) return '—';
  return new Intl.NumberFormat(appLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Localized currency amount (default EUR). */
export function fmtMoney(value: any, currency = 'EUR', decimals = 2): string {
  const n = safeNum(value);
  if (n === null) return '—';
  return new Intl.NumberFormat(appLocale(), {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export const fmtKm = (v: any) => `${fmtNumber(v, Number(v) % 1 !== 0 ? 1 : 0)} km`;
export const fmtWeightKg = (v: any) => `${fmtNumber(v)} kg`;
export const fmtVolumeM3 = (v: any) => `${fmtNumber(v, 1)} m³`;
export const fmtLdm = (v: any) => `${fmtNumber(v, 2)} LDM`;
export const fmtPallets = (v: any) => `${fmtNumber(v)} ${Number(v) === 1 ? 'pallet' : 'pallets'}`;
export const fmtPercent = (v: any, decimals = 1) => `${fmtNumber(v, decimals)}%`;

/** Signed money, e.g. +€123,45 / -€1.234,00 */
export function fmtMoneySigned(value: any, currency = 'EUR'): string {
  const n = safeNum(value);
  if (n === null) return '—';
  return `${n > 0 ? '+' : ''}${fmtMoney(n, currency)}`;
}
