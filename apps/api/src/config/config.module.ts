import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadEnv, type Env } from './env';

export { loadEnv };
export type { Env };

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => loadEnv()],
      validate: (config) => loadEnv(config),
    }),
  ],
  providers: [
    {
      provide: 'ENV',
      useFactory: () => loadEnv(),
      inject: [],
    },
  ],
  exports: [ConfigModule, 'ENV'],
})
export class AppConfigModule {}
