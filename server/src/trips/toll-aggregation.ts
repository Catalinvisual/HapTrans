// Toll aggregation across route legs.
//
// A trip's legs can come from different providers and, in principle, different
// currencies (a PLN toll section must never be added to a EUR total). This
// helper is deliberately fail-closed: a consolidated total is returned only when
// every leg that reported a toll reported it in EUR and with a usable status.
// Otherwise the caller must persist "unavailable" instead of a number, so a PLN
// amount can never be silently relabelled as EUR.

export interface LegTollInput {
  tollCost?: unknown;
  tollCurrency?: unknown;
  currency?: unknown;
  tollStatus?: unknown;
  tollAvailable?: unknown;
  available?: unknown;
}

export type TollAggregateStatus = 'calculated' | 'calculated_zero' | 'unavailable' | 'none';

export interface TollAggregate {
  status: TollAggregateStatus;
  totalCost: number | null;
  currency: 'EUR';
  currencies: string[];
  legs: number;
  reason: string | null;
}

const BASE_CURRENCY = 'EUR';

function legCurrency(leg: LegTollInput): string | null {
  const raw = leg?.tollCurrency ?? leg?.currency ?? null;
  if (raw == null) return null;
  const value = String(raw).trim().toUpperCase();
  return value.length ? value : null;
}

function legIsUnavailable(leg: LegTollInput): boolean {
  if (!leg) return true;
  if (leg.tollAvailable === false || leg.available === false) return true;
  const status = leg.tollStatus == null ? '' : String(leg.tollStatus).toLowerCase();
  return status === 'unavailable' || status === 'not_calculated';
}

export function aggregateLegTolls(legs: LegTollInput[], expectedLegs?: number): TollAggregate {
  const list = Array.isArray(legs) ? legs.filter(Boolean) : [];
  if (!list.length) {
    return { status: 'none', totalCost: null, currency: BASE_CURRENCY, currencies: [], legs: 0, reason: null };
  }
  const expected = Number.isFinite(Number(expectedLegs)) && Number(expectedLegs) > 0 ? Number(expectedLegs) : null;
  if (expected && list.length < expected) {
    return {
      status: 'unavailable',
      totalCost: null,
      currency: BASE_CURRENCY,
      currencies: [],
      legs: list.length,
      reason: `Toll data is missing for ${expected - list.length} of ${expected} route legs, so the route total is incomplete.`,
    };
  }

  const currencies: string[] = [];
  let total = 0;
  let sawCharge = false;
  let unavailable = false;
  let missingCurrency = false;

  for (const leg of list) {
    if (legIsUnavailable(leg)) {
      unavailable = true;
      continue;
    }
    const currency = legCurrency(leg);
    if (currency) currencies.push(currency);
    if (!currency) missingCurrency = true;

    if (currency && currency !== BASE_CURRENCY) {
      // A foreign-currency amount cannot be added to a EUR total.
      unavailable = true;
      continue;
    }
    const amount = Number(leg.tollCost);
    if (!Number.isFinite(amount) || amount < 0) {
      unavailable = true;
      continue;
    }
    total += amount;
    if (amount > 0) sawCharge = true;
  }

  const uniqueCurrencies = Array.from(new Set(currencies)).sort();

  if (missingCurrency) {
    return {
      status: 'unavailable',
      totalCost: null,
      currency: BASE_CURRENCY,
      currencies: uniqueCurrencies,
      legs: list.length,
      reason: 'A leg reported a toll without its currency, so the total cannot be reconciled.',
    };
  }
  if (uniqueCurrencies.some((currency) => currency !== BASE_CURRENCY)) {
    return {
      status: 'unavailable',
      totalCost: null,
      currency: BASE_CURRENCY,
      currencies: uniqueCurrencies,
      legs: list.length,
      reason: `Tolls were reported in ${uniqueCurrencies.join(', ')} without an explicit exchange rate; no consolidated EUR total is shown.`,
    };
  }
  if (unavailable) {
    return {
      status: 'unavailable',
      totalCost: null,
      currency: BASE_CURRENCY,
      currencies: uniqueCurrencies,
      legs: list.length,
      reason: 'At least one leg has no usable toll figure, so the route total is incomplete.',
    };
  }

  const rounded = Math.round(total * 100) / 100;
  return {
    status: sawCharge ? 'calculated' : 'calculated_zero',
    totalCost: rounded,
    currency: BASE_CURRENCY,
    currencies: uniqueCurrencies,
    legs: list.length,
    reason: null,
  };
}
