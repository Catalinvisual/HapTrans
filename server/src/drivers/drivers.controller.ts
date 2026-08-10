import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  constructor(private service: DriversService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Get('hos-summary') getHosSummaryAll() { return this.service.getHosSummaryAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/documents') addDocument(@Param('id') id: string, @Body() dto: any) { return this.service.addDocument(id, dto); }

  @Get(':id/hos') getHos(@Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getHos(id, from, to);
  }
  @Post(':id/hos') saveHos(@Param('id') id: string, @Body() dto: any) { return this.service.saveHos(id, dto); }
  @Delete('hos/:hosId') removeHos(@Param('hosId') hosId: string) { return this.service.removeHos(hosId); }
}
