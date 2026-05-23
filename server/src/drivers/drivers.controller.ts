import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  constructor(private service: DriversService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/documents') addDocument(@Param('id') id: string, @Body() dto: any) { return this.service.addDocument(id, dto); }
}
