import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private service: ClientsService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }

  @Get(':id/rates') getRates(@Param('id') id: string) { return this.service.getRates(id); }
  @Post(':id/rates') createRate(@Param('id') id: string, @Body() dto: any) { return this.service.createRate(id, dto); }
  @Patch('rates/:id') updateRate(@Param('id') id: string, @Body() dto: any) { return this.service.updateRate(id, dto); }
  @Delete('rates/:id') removeRate(@Param('id') id: string) { return this.service.removeRate(id); }

  @Get(':id/locations') getLocations(@Param('id') id: string) { return this.service.getLocations(id); }
  @Post(':id/locations') createLocation(@Param('id') id: string, @Body() dto: any) { return this.service.createLocation(id, dto); }
  @Patch('locations/:id') updateLocation(@Param('id') id: string, @Body() dto: any) { return this.service.updateLocation(id, dto); }
  @Delete('locations/:id') removeLocation(@Param('id') id: string) { return this.service.removeLocation(id); }
}
