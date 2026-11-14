import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PortalAuthService } from './portal-auth.service';
import { PortalAuthController } from './portal-auth.controller';
import { PortalUsersModule } from '../portal-users/portal-users.module';
import { PortalJwtStrategy } from './portal-jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalUser } from '../portal-users/portal-user.entity';

@Module({
  imports: [
    PortalUsersModule,
    TypeOrmModule.forFeature([PortalUser]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // A dedicated secret is used when it is configured; otherwise the
        // portal keeps signing with the shared secret so no session is lost.
        secret: configService.get<string>('PORTAL_JWT_SECRET') || configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [PortalAuthService, PortalJwtStrategy],
  controllers: [PortalAuthController],
  exports: [PortalAuthService],
})
export class PortalAuthModule {}
