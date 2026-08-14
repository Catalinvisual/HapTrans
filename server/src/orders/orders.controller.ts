import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { TripScannerService } from '../trips/trip-scanner.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly tripScannerService: TripScannerService,
  ) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.ordersService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  create(@Body() dto: any, @Request() req: any) {
    if (req.user?.company?.id) {
      dto.companyId = req.user.company.id;
    }
    return this.ordersService.create(dto, req.user);
  }

  @Post('scan')
  @UseInterceptors(FileInterceptor('file'))
  scanFile(@UploadedFile() file: Express.Multer.File) {
    return this.tripScannerService.scanTripDocument(file.buffer, file.mimetype);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importRateConfirmation(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    const extracted = await this.tripScannerService.scanTripDocument(file.buffer, file.mimetype);
    return this.ordersService.createFromScan(extracted, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.ordersService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
