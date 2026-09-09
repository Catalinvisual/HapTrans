import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { RedisConnection } from '../redis/redis.module';
import { StorageService } from '../storage/storage.module';
import { ConfigService } from '@nestjs/config';

interface HealthComponent {
  status: 'ok' | 'degraded' | 'down';
  detail?: string;
}

interface HealthReport {
  status: 'ok' | 'degraded' | 'down';
  components: Record<string, HealthComponent>;
  timestamp: string;
}

/**
 * Health checks (architecture §29 / TASK 03 §17).
 * - /health    -> liveness (process is up). No external dependencies required.
 * - /ready     -> readiness (API process + database + Redis + storage ready).
 * Does not expose sensitive infrastructure information.
 */
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisConnection,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  @Get('health')
  liveness(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async readiness(): Promise<HealthReport> {
    const components: Record<string, HealthComponent> = {};

    // Database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      components.database = { status: 'ok' };
    } catch (e) {
      components.database = {
        status: 'down',
        detail: e instanceof Error ? 'database unreachable' : 'unknown',
      };
    }

    // Redis
    try {
      await this.redis.ping();
      components.redis = { status: 'ok' };
    } catch {
      components.redis = { status: 'down', detail: 'redis unreachable' };
    }

    // Object storage (optional connectivity probe; may be unavailable in some dev setups)
    const bucket = this.config.get<string>('S3_BUCKET') ?? 'hapcargo';
    try {
      await this.storage.ensureBucket(bucket);
      components.storage = { status: 'ok' };
    } catch (e) {
      components.storage = {
        status: 'degraded',
        detail: e instanceof Error ? 'storage unreachable' : 'unknown',
      };
    }

    const status: HealthReport['status'] =
      components.database.status === 'down' || components.redis.status === 'down'
        ? 'down'
        : Object.values(components).some((c) => c.status === 'degraded')
          ? 'degraded'
          : 'ok';

    const report: HealthReport = { status, components, timestamp: new Date().toISOString() };
    if (status === 'down') {
      throw new ServiceUnavailableException(report);
    }
    return report;
  }
}
