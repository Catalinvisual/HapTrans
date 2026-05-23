import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private service: TripsService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get('stats') getStats(@Query('month') m: number, @Query('year') y: number) { return this.service.getStats(m, y); }
  @Get('monthly-profits') getMonthly() { return this.service.getMonthlyProfits(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/costs') addCost(@Param('id') id: string, @Body() dto: any) { return this.service.addCost(id, dto); }
}
