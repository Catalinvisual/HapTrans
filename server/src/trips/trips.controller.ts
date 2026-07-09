import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TripsService } from './trips.service';
import { TripScannerService } from './trip-scanner.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(
    private service: TripsService,
    private scanner: TripScannerService,
  ) {}
  @Get() findAll(@Query('status') status?: string) { return this.service.findAll(status); }
  
  @Post('migrate-legacy') 
  migrateLegacy() { return this.service.migrateLegacyTrips(); }

  @Get('stats') getStats(@Query('month') m: number, @Query('year') y: number) { return this.service.getStats(m, y); }
  @Get('monthly-profits') getMonthly() { return this.service.getMonthlyProfits(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateTripDto, @Request() req: any) { return this.service.create(dto, req.user); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateTripDto, @Request() req: any) { return this.service.update(id, dto, req.user); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Get('debug/:ref') async getDebug(@Param('ref') ref: string) { return this.service.findOneByRef(ref); }
  @Post(':id/costs') addCost(@Param('id') id: string, @Body() dto: any) { return this.service.addCost(id, dto); }

  @Post(':id/assign-orders')
  assignOrders(@Param('id') id: string, @Body() body: { orderIds: string[] }) {
    return this.service.assignOrders(id, body.orderIds);
  }

  @Post(':id/optimize')
  optimizeRoute(@Param('id') id: string) {
    return this.service.optimizeRoute(id);
  }

  @Patch('stops/:stopId/status')
  updateStopStatus(@Param('stopId') stopId: string, @Body() body: any) {
    return this.service.updateStopStatus(stopId, body.status);
  }

  @Patch('tasks/:taskId/status')
  updateTaskStatus(@Param('taskId') taskId: string, @Body() body: any) {
    return this.service.updateTaskStatus(taskId, body.status);
  }

  @Post(':id/stops/reorder')
  reorderStops(@Param('id') id: string, @Body() body: { stopIds: string[] }) {
    return this.service.reorderStops(id, body.stopIds);
  }

  @Post('scan-document')
  @UseInterceptors(FileInterceptor('file'))
  async scanDocument(@UploadedFile() file: Express.Multer.File) {
    try {
      const parsed = await this.scanner.scanTripDocument(file.buffer, file.mimetype);
      return { fileUrl: null, parsed };
    } catch (e) {
      console.error('Trip scan failed:', e);
      return { fileUrl: null, parsed: null, error: e.message };
    }
  }
}
