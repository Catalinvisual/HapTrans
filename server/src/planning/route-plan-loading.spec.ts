import { withRoutePlanInitLock } from './route-plan-init-lock';
import { asJsonArray } from './route-plan-json';

/**
 * Regression coverage for the planner's first-open initialization. Before the
 * lock, concurrent reads could both create a plan and one request failed.
 */
describe('route plan JSON normalization', () => {
  it('turns a double-encoded empty JSON array into an array', () => {
    const value = asJsonArray('[]');
    expect(Array.isArray(value)).toBe(true);
    expect(value).toHaveLength(0);
  });

  it('parses a persisted JSON array without changing valid arrays', () => {
    const issues = [{ code: 'warning', message: 'Check dimensions' }];
    expect(asJsonArray(JSON.stringify(issues))).toEqual(issues);
    expect(asJsonArray(issues)).toBe(issues);
  });

  it('returns an empty array for null and malformed values', () => {
    expect(asJsonArray(null)).toEqual([]);
    expect(asJsonArray('not-json')).toEqual([]);
    expect(asJsonArray({ code: 'warning' })).toEqual([]);
  });
});

describe('route plan initialization lock', () => {
  const repo = { manager: { connection: { options: { type: 'sqlite' } } } };

  it('serializes initialization for the same trip', async () => {
    const events: string[] = [];

    const first = withRoutePlanInitLock('trip:trip-1', repo, async () => {
      events.push('first-start');
      await new Promise((resolve) => setTimeout(resolve, 20));
      events.push('first-end');
    });
    const second = withRoutePlanInitLock('trip:trip-1', repo, async () => {
      events.push('second-start');
      events.push('second-end');
    });

    await Promise.all([first, second]);
    expect(events).toEqual(['first-start', 'first-end', 'second-start', 'second-end']);
  });

  it('does not serialize unrelated trips', async () => {
    const events: string[] = [];
    let releaseFirst!: () => void;
    const firstHeld = new Promise<void>((resolve) => { releaseFirst = resolve; });

    const first = withRoutePlanInitLock('trip:trip-1', repo, async () => {
      events.push('first-start');
      await firstHeld;
      events.push('first-end');
    });
    const second = withRoutePlanInitLock('trip:trip-2', repo, async () => {
      events.push('second-start');
      events.push('second-end');
    });

    await second;
    expect(events).toEqual(['first-start', 'second-start', 'second-end']);
    releaseFirst();
    await first;
    expect(events).toEqual(['first-start', 'second-start', 'second-end', 'first-end']);
  });
});
