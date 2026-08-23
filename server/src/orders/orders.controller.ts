import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Request, Query, UseInterceptors, UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { TripScannerService } from '../trips/trip-scanner.service';
import { ExcelImportService } from './excel-import/excel-import.service';
import type { ImportConfirmRequest } from './excel-import/excel-import.types';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly tripScannerService: TripScannerService,
    private readonly excelImportService: ExcelImportService,
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

  // ─── PDF / image scan (unchanged) ─────────────────────────────────────────

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

  // ─── NEW: Universal AI Excel Import ────────────────────────────────────────

  /**
   * Step 1 — Upload Excel, get back a full ImportPreviewResult:
   * - AI column mappings with confidence scores
   * - Per-row normalized data and issues
   * - Duplicate detection results
   * - An analyzeId that the client sends back on confirm
   */
  @Post('excel/analyze')
  @UseInterceptors(FileInterceptor('file'))
  async excelAnalyze(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const companyId = req.user?.company?.id;
    return this.excelImportService.analyze(file.buffer, file.originalname, companyId);
  }

  /**
   * Step 2 — Confirm import with (possibly user-edited) mappings.
   * The file is re-uploaded so no server-side buffer state is required.
   * Request body fields:
   *   - analyzeId: string
   *   - mappings: FieldMapping[] (JSON string in multipart)
   *   - selectedIndices: number[] (JSON string)
   *   - duplicateStrategy: 'skip' | 'update' | 'import_anyway'
   */
  @Post('excel/confirm')
  @UseInterceptors(FileInterceptor('file'))
  async excelConfirm(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    let request: ImportConfirmRequest;
    try {
      const body = req.body || {};
      request = {
        analyzeId: String(body.analyzeId || ''),
        mappings: JSON.parse(body.mappings || '[]'),
        selectedIndices: JSON.parse(body.selectedIndices || '[]'),
        duplicateStrategy: body.duplicateStrategy || 'skip',
      };
    } catch (e: any) {
      throw new BadRequestException(`Invalid request body: ${e.message}`);
    }

    const buffer = file?.buffer || Buffer.alloc(0);
    return this.excelImportService.confirm(buffer, request, req.user);
  }

  // ─── Standard CRUD (unchanged) ─────────────────────────────────────────────

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.ordersService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
