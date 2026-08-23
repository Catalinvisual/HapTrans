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
  async scanFile(@UploadedFile() file: Express.Multer.File) {
    const result = await this.tripScannerService.scanDocument(file.buffer, file.mimetype, file.originalname);
    // Complete partial addresses BEFORE the user sees the preview
    const trips = await this.ordersService.enrichScannedTrips(result?.trips || []);
    return { trips };
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importRateConfirmation(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    const { trips } = await this.tripScannerService.scanDocument(file.buffer, file.mimetype, file.originalname);

    // Client may deselect trips in the preview modal; `indices` is a JSON array of kept positions.
    let selected = trips;
    try {
      const raw = req.body?.indices;
      if (raw) {
        const indices: number[] = JSON.parse(raw);
        if (Array.isArray(indices) && indices.length > 0) {
          selected = trips.filter((_, i) => indices.includes(i));
        }
      }
    } catch { /* malformed indices -> import all */ }

    const created = [];
    for (const trip of selected) {
      created.push(await this.ordersService.createFromScan(trip, req.user));
    }
    return { created };
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
