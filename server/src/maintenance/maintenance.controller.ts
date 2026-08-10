import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(private service: MaintenanceService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get('truck/:truckId') findByTruck(@Param('truckId') truckId: string) { return this.service.findByTruck(truckId); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/attachments') addAttachment(@Param('id') id: string, @Body() dto: any) { return this.service.addAttachment(id, dto); }
  @Delete('attachments/:attId') removeAttachment(@Param('attId') attId: string) { return this.service.removeAttachment(attId); }
}
