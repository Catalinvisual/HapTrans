import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { LoggerModule } from './logging/logger.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { BullModule } from './queue/bull.module';
import { HealthModule } from './health/health.module';
import { FoundationModule } from './foundation/foundation.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MasterDataModule } from './master-data/master-data.module';
import { CustomersModule } from './customers/customers.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { RequestIdMiddleware } from './common/request-id.middleware';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    DatabaseModule,
    RedisModule,
    StorageModule,
    BullModule,
    HealthModule,
    FoundationModule,
    UsersModule,
    AuthModule,
    MasterDataModule,
    CustomersModule,
    AnalyticsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
