export type DateOnly = string; // 'YYYY-MM-DD'

export function addDays(date: DateOnly, days: number): DateOnly {
  const [y = '1970', m = '01', d = '01'] = date.split('-');
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + days));
  return dt.toISOString().slice(0, 10);
}

export function today(): DateOnly {
  return new Date().toISOString().slice(0, 10);
}
