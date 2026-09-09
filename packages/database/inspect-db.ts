import { PrismaClient } from '@prisma/client';

async function main() {
  const p = new PrismaClient();
  const rows = await p.$queryRawUnsafe<Array<{ migration_name: string; finished_at: Date | null; applied_steps_count: number; rolled_back_at: Date | null }>>(
    `SELECT migration_name, finished_at, applied_steps_count, rolled_back_at FROM _prisma_migrations`,
  ).catch(() => []);
  console.log('PRISMA_MIGRATIONS', JSON.stringify(rows));
  const tables = await p.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  console.log('TABLES', tables.map((t) => t.tablename).join(', '));
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});