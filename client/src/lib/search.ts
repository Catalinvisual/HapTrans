const normalize = (input: any): string =>
  String(input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const compact = (s: string): string => s.replace(/[^a-z0-9]+/g, '');

export function searchTokens(query: string | null | undefined): string[] {
  return normalize(query).split(/[^a-z0-9]+/).filter(Boolean);
}

export function buildHaystack(...fields: any[]): string {
  return compact(normalize(fields.filter(v => v != null && String(v) !== '').join(' ')));
}

export function matchesSearch(query: string | null | undefined, ...fields: any[]): boolean {
  const tokens = searchTokens(query);
  if (!tokens.length) return true;
  const hay = buildHaystack(...fields);
  return tokens.every(token => hay.includes(token));
}