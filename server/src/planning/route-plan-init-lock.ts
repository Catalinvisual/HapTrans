const localLocks = new Map<string, Promise<void>>();

/**
 * Serializes route-plan read-or-create work per key.
 *
 * PostgreSQL advisory locks cover concurrent requests and multiple backend
 * instances. The in-memory tail also protects test/dev stores that do not
 * support advisory locks. The key must identify the trip or truck/date scope.
 */
export async function withRoutePlanInitLock<T>(
  key: string,
  routePlanRepo: any,
  work: () => Promise<T>,
): Promise<T> {
  const previous = localLocks.get(key) || Promise.resolve();
  let releaseLocal!: () => void;
  const current = new Promise<void>((resolve) => { releaseLocal = resolve; });
  const tail = previous.then(() => current);
  localLocks.set(key, tail);
  await previous;

  const connection = routePlanRepo?.manager?.connection;
  let queryRunner: any = null;
  let databaseLockHeld = false;
  try {
    if (connection?.options?.type === 'postgres' && typeof connection.createQueryRunner === 'function') {
      queryRunner = connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.query('SELECT pg_advisory_lock($1, hashtext($2))', [48121, key]);
      databaseLockHeld = true;
    }
    return await work();
  } finally {
    if (queryRunner) {
      try {
        if (databaseLockHeld) {
          await queryRunner.query('SELECT pg_advisory_unlock($1, hashtext($2))', [48121, key]);
        }
      } finally {
        await queryRunner.release();
      }
    }
    releaseLocal();
    if (localLocks.get(key) === tail) localLocks.delete(key);
  }
}
