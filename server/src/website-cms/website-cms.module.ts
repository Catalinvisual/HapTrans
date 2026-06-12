import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebsiteCms } from './website-cms.entity';
import { WebsiteCmsService } from './website-cms.service';
import { WebsiteCmsController } from './website-cms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WebsiteCms])],
  providers: [WebsiteCmsService],
  controllers: [WebsiteCmsController],
  exports: [WebsiteCmsService],
})
export class WebsiteCmsModule {}
