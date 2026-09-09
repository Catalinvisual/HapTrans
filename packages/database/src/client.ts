import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma client. The API app instantiates its own service around this
 * so it can be injected/closed by NestJS lifecycle; this file provides a
 * singleton for tooling (seeds, scripts) and reference.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
