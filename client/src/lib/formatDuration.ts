import i18n from './i18n';

/**
 * Short duration units per TMS language. Delays are shown as "49 d 5 h" instead
 * of "70881 min": an office user reads hours and days, not five-digit minutes.
 */
const UNITS: Record<string, { day: string; hour: string; minute: string }> = {
  ro: { day: 'z', hour: 'h', minute: 'min' },
  en: { day: 'd', hour: 'h', minute: 'min' },
  nl: { day: 'd', hour: 'u', minute: 'min' },
  de: { day: 'T', hour: 'Std', minute: 'Min' },
  fr: { day: 'j', hour: 'h', minute: 'min' },
  es: { day: 'd', hour: 'h', minute: 'min' },
  pl: { day: 'd', hour: 'g', minute: 'min' },
};

/**
 * Formats a duration in minutes as days/hours/minutes.
 * Below one hour: "45 min" · below one day: "5 h 20 min" · above: "49 d 5 h".
 */
export function formatDuration(minutes: number, language?: string): string {
  const lang = String(language || i18n.language || 'en').slice(0, 2).toLowerCase();
  const units = UNITS[lang] || UNITS.en;
  const total = Math.round(Math.abs(Number(minutes) || 0));
  if (total < 60) return `${total} ${units.minute}`;

  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;

  if (days > 0) {
    return hours > 0 ? `${days} ${units.day} ${hours} ${units.hour}` : `${days} ${units.day}`;
  }
  return mins > 0 ? `${hours} ${units.hour} ${mins} ${units.minute}` : `${hours} ${units.hour}`;
}

/** Same as formatDuration but with the sign an ETA badge shows: "+2 h 15 min". */
export function formatDelay(minutes: number, language?: string): string {
  const value = Number(minutes) || 0;
  return `${value >= 0 ? '+' : '-'}${formatDuration(Math.abs(value), language)}`;
}
