import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdrCatalogVersion } from './adr-catalog-version.entity';
import { AdrCatalogItem } from './adr-catalog-item.entity';
import { Order } from '../orders/order.entity';
import { CargoItem } from '../orders/cargo-item.entity';
import { AdrService } from './adr.service';
import { AdrController } from './adr.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdrCatalogVersion,
      AdrCatalogItem,
      Order,
      CargoItem,
    ]),
  ],
  controllers: [AdrController],
  providers: [AdrService],
  exports: [AdrService, TypeOrmModule],
})
export class AdrModule {}
