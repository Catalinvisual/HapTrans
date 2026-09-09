import { Global, Inject, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_CONNECTION = 'REDIS_CONNECTION';

/**
 * Redis foundation (architecture §20).
 * Provides a shared ioredis client for future caching, rate limiting and
 * BullMQ. No business caching is added yet.
 */
@Injectable()
export class RedisConnection implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  get raw(): Redis {
    return this.redisClient;
  }

  async ping(): Promise<string> {
    return this.redisClient.ping();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.redisClient.ping();
      return true;
    } catch {
      return false;
    }
  }

  onModuleDestroy(): void {
    this.redisClient.disconnect();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        return new Redis(url, {
          lazyConnect: false,
          maxRetriesPerRequest: null,
        });
      },
    },
    RedisConnection,
  ],
  exports: [REDIS_CLIENT, RedisConnection],
})
export class RedisModule {}
