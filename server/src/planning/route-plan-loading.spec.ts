import { withRoutePlanInitLock } from './route-plan-init-lock';

/**
 * Regression coverage for the planner's first-open initialization. Before the
 * lock, concurrent reads could both create a plan and one request failed.
 */
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
