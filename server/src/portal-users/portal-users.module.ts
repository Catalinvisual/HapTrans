import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalUser } from './portal-user.entity';
import { PortalUsersService } from './portal-users.service';
import { PortalUsersController } from './portal-users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PortalUser])],
  providers: [PortalUsersService],
  controllers: [PortalUsersController],
  exports: [PortalUsersService],
})
export class PortalUsersModule {}
