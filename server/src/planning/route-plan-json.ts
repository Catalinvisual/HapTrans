/**
 * Persisted JSONB fields should be arrays, but legacy rows can contain a
 * double-encoded JSON string (for example "[]"). Normalizing at the planner
 * boundary prevents a successfully loaded plan from failing during rendering.
 */
export function asJsonArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}
