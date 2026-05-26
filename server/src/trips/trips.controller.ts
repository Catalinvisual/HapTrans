import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TripsService } from './trips.service';
import { TripScannerService } from './trip-scanner.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(
    private service: TripsService,
    private scanner: TripScannerService,
  ) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get('stats') getStats(@Query('month') m: number, @Query('year') y: number) { return this.service.getStats(m, y); }
  @Get('monthly-profits') getMonthly() { return this.service.getMonthlyProfits(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any, @Request() req: any) { return this.service.update(id, dto, req.user); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/costs') addCost(@Param('id') id: string, @Body() dto: any) { return this.service.addCost(id, dto); }

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
