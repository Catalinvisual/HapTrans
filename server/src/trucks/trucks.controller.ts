import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { TrucksService } from './trucks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('trucks')
@UseGuards(JwtAuthGuard)
export class TrucksController {
  constructor(private service: TrucksService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get('expiring') getExpiring() { return this.service.getExpiringDocuments(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/documents') addDocument(@Param('id') id: string, @Body() dto: any) { return this.service.addDocument(id, dto); }
}
