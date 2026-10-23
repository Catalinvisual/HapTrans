import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdrService } from './adr.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('adr')
export class AdrController {
  constructor(private readonly adrService: AdrService) {}

  @Get('catalog')
  searchCatalog(
    @Query('q') query?: string,
    @Query('adrClass') adrClass?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('lang') lang?: string,
  ) {
    return this.adrService.searchCatalog({
      query,
      adrClass,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      lang: lang || 'ro',
    });
  }

  @Get('catalog-versions')
  listVersions() {
    return this.adrService.listVersions();
  }

  @Get('catalog/:unNumber')
  findByUnNumber(
    @Param('unNumber') unNumber: string,
    @Query('packingGroup') packingGroup?: string,
  ) {
    return this.adrService.findByUnNumber(unNumber, packingGroup);
  }

  @Post('calculate-points')
  calculatePoints(@Body() body: { items: any[] }) {
    return this.adrService.calculatePoints(body.items || []);
  }

  @Post('evaluate-order/:orderId')
  @UseGuards(JwtAuthGuard)
  evaluateOrder(@Param('orderId') orderId: string) {
    return this.adrService.evaluateOrder(orderId);
  }

  @Post('catalog/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  importCatalog(@Body() dto: any) {
    return this.adrService.importCatalogEdition(dto);
  }
}
