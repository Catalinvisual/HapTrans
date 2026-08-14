import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { TrucksService } from './trucks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('trucks')
@UseGuards(JwtAuthGuard)
export class TrucksController {
  constructor(private service: TrucksService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get('availability') getAvailability() { return this.service.getAvailability(); }
  @Get('expiring') getExpiring() { return this.service.getExpiringDocuments(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: any, @Req() req: any) { return this.service.create(dto, req.user); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any, @Req() req: any) { return this.service.update(id, dto, req.user); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/documents') addDocument(@Param('id') id: string, @Body() dto: any) { return this.service.addDocument(id, dto); }
  @Delete('documents/:docId') removeDocument(@Param('docId') docId: string) { return this.service.removeDocument(docId); }
}
