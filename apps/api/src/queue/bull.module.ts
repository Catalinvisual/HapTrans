import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, type ConnectionOptions } from 'bullmq';
import { REDIS_CLIENT } from '../redis/redis.module';
import type Redis from 'ioredis';

export const QUEUES = 'QUEUES';

/**
 * BullMQ foundation (ADR-013 / TASK 03 §21).
 * A reusable job/queue abstraction. Only a test/example infrastructure queue is
 * created at this stage — no business jobs yet.
 * Future workloads: PDF, exports, imports, notifications, emails, OCR,
 * scheduled reports, integrations, telematics, analytics, AI.
 */
export class Queues {
  readonly example: Queue;

  constructor(connection: ConnectionOptions) {
    this.example = new Queue('example', { connection, defaultJobOptions: { removeOnComplete: 100, removeOnFail: 500 } });
  }

  async close(): Promise<void> {
    await this.example.close();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: QUEUES,
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (config: ConfigService, _redis: Redis) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        const connection: ConnectionOptions = { url };
        return new Queues(connection);
      },
    },
  ],
  exports: [QUEUES],
})
export class BullModule {}
