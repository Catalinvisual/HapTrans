import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { nanoid } from 'nanoid';

import { WorkbookAnalyzer } from './workbook-analyzer';
import { AiMapperService } from './ai-mapper.service';
import { RowNormalizer } from './row-normalizer';
import { DuplicateDetector } from './duplicate-detector';
import { ImportAudit } from './import-audit.entity';

import type {
  FieldMapping,
  ImportPreviewResult,
  ImportConfirmRequest,
  ImportConfirmResult,
  ImportRowResult,
  ImportStats,
  NormalizedOrderRow,
} from './excel-import.types';
import { CONFIDENCE_AUTO_ACCEPT, CONFIDENCE_WARN } from './excel-import.types';
import { OrdersService } from '../orders.service';

// ─── In-memory session cache (cleared after 30 min) ─────────────────────────
interface AnalyzeSession {
  buffer: Buffer;
  fileName: string;
  sheetName: string;
  headerRowIndex: number;
  createdAt: number;
}
const SESSION_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class ExcelImportService {
  private readonly logger = new Logger(ExcelImportService.name);
  private readonly sessions = new Map<string, AnalyzeSession>();

  constructor(
    private readonly aiMapper: AiMapperService,
    private readonly duplicateDetector: DuplicateDetector,
    private readonly ordersService: OrdersService,
    @InjectRepository(ImportAudit)
    private readonly auditRepo: Repository<ImportAudit>,
  ) {
    // Periodically clear expired sessions
    setInterval(() => this.cleanupSessions(), 5 * 60 * 1000);
  }

  // ─── Step 1: Analyze Excel → preview ─────────────────────────────────────

  async analyze(
    buffer: Buffer,
    fileName: string,
    companyId?: string,
  ): Promise<ImportPreviewResult> {
    if (!buffer?.length) throw new BadRequestException('Empty file');

    // 1. Parse workbook deterministically
    const context = WorkbookAnalyzer.analyze(buffer, fileName);
    const sheet = context.primarySheet;
    this.logger.log(
      `Analyzed "${fileName}": sheet "${sheet.sheetName}", ${sheet.rowCount} data rows, ${sheet.columnCount} columns`
    );

    // 2. Ask AI for column mappings
    const mappings = await this.aiMapper.mapColumns(context);

    // Apply confidence thresholds to detect 'needs_review' status
    const mappingsWithStatus = mappings.map(m => ({
      ...m,
      _status: m.confidence >= CONFIDENCE_AUTO_ACCEPT
        ? 'accepted'
        : m.confidence >= CONFIDENCE_WARN
          ? 'warning'
          : 'needs_review',
    }));

    // 3. Extract raw rows using mappings
    const rawRows = WorkbookAnalyzer.extractRawRows(
      buffer,
      sheet.sheetName,
      sheet.headerRowIndex,
      mappings,
    );

    // 4. Normalize each row deterministically
    const rows: ImportRowResult[] = rawRows.map((raw, i) =>
      RowNormalizer.normalizeRow(raw, i, sheet.headerRowIndex + 2 + i)
    );

    // Apply 'needs_review' status for rows with low-confidence mapped columns
    const lowConfidenceCols = new Set(
      mappings
        .filter(m => m.confidence < CONFIDENCE_WARN && m.targetField !== 'IGNORE')
        .map(m => m.targetField)
    );
    for (const row of rows) {
      if (row.status === 'valid' && lowConfidenceCols.size > 0) {
        // Check if any low-confidence field has data in this row
        const hasLowConfData = [...lowConfidenceCols].some(
          field => (row.data as any)[field] !== undefined
        );
        if (hasLowConfData) {
          row.status = 'needs_review';
          row.issues.push({
            field: 'mapping',
            message: 'Some column mappings have low confidence — please review',
            severity: 'warning',
          });
        }
      }
    }

    // 5. Detect duplicates
    await this.duplicateDetector.detectDuplicates(rows, companyId);

    // 6. Compute stats
    const stats = this.computeStats(rows);

    // 7. Store session for confirm step
    const analyzeId = nanoid(16);
    this.sessions.set(analyzeId, {
      buffer,
      fileName,
      sheetName: sheet.sheetName,
      headerRowIndex: sheet.headerRowIndex,
      createdAt: Date.now(),
    });

    return {
      analyzeId,
      workbookInfo: {
        fileName,
        sheetName: sheet.sheetName,
        rowCount: sheet.rowCount,
        columnCount: sheet.columnCount,
      },
      mappings: mappingsWithStatus as FieldMapping[],
      rows,
      stats,
    };
  }

  // ─── Step 2: Confirm → create orders ─────────────────────────────────────

  async confirm(
    incomingBuffer: Buffer,
    request: ImportConfirmRequest,
    user: any,
  ): Promise<ImportConfirmResult> {
    const importId = nanoid(20);
    const companyId = user?.company?.id;

    // Prefer session buffer; fall back to the re-uploaded file
    const session = this.sessions.get(request.analyzeId);
    const buffer = session?.buffer || incomingBuffer;
    const fileName = session?.fileName || 'import.xlsx';
    const sheetName = session?.sheetName;
    const headerRowIndex = session?.headerRowIndex ?? 0;

    if (!buffer?.length) throw new BadRequestException('No file data available');

    // 1. Re-parse with confirmed (possibly user-edited) mappings
    let rawRows: Record<string, string>[];
    try {
      rawRows = WorkbookAnalyzer.extractRawRows(
        buffer,
        sheetName || WorkbookAnalyzer.analyze(buffer, fileName).primarySheet.sheetName,
        headerRowIndex,
        request.mappings,
      );
    } catch (e: any) {
      throw new BadRequestException(`Could not parse workbook: ${e.message}`);
    }

    // 2. Normalize rows
    const allRows: ImportRowResult[] = rawRows.map((raw, i) =>
      RowNormalizer.normalizeRow(raw, i, headerRowIndex + 2 + i)
    );

    // 3. Filter to selected indices
    const selectedSet = new Set(request.selectedIndices);
    const selectedRows = allRows.filter(r => selectedSet.has(r.rowIndex));

    // 4. Duplicate check on selected rows
    await this.duplicateDetector.detectDuplicates(selectedRows, companyId);

    // 5. Create orders
    const createdOrderIds: string[] = [];
    const errors: Array<{ rowIndex: number; message: string }> = [];
    let skippedCount = 0;

    for (const row of selectedRows) {
      // Handle duplicates per strategy
      if (row.status === 'duplicate') {
        if (request.duplicateStrategy === 'skip') {
          skippedCount++;
          continue;
        }
        if (request.duplicateStrategy === 'update' && row.duplicateOrderId) {
          try {
            const dto = this.buildOrderDto(row.data, companyId, user);
            await this.ordersService.update(row.duplicateOrderId, dto, user);
            createdOrderIds.push(row.duplicateOrderId);
          } catch (e: any) {
            errors.push({ rowIndex: row.rowIndex, message: e.message });
          }
          continue;
        }
        // import_anyway falls through to create
      }

      if (row.status === 'invalid') {
        errors.push({ rowIndex: row.rowIndex, message: 'Row is invalid: ' + row.issues.map(i => i.message).join('; ') });
        continue;
      }

      try {
        const dto = this.buildOrderDto(row.data, companyId, user);
        const created = await this.ordersService.create(dto, user);
        if (created) createdOrderIds.push((created as any).id);
      } catch (e: any) {
        this.logger.error(`Row ${row.rowIndex} create error:`, e.message);
        errors.push({ rowIndex: row.rowIndex, message: e.message });
      }
    }

    // 6. Save audit record
    try {
      const audit = this.auditRepo.create({
        company: companyId ? { id: companyId } as any : null,
        uploadedBy: user?.id ? { id: user.id } as any : null,
        uploadedFileName: fileName,
        rowCount: allRows.length,
        createdCount: createdOrderIds.length,
        duplicateCount: selectedRows.filter(r => r.status === 'duplicate').length,
        warningCount: selectedRows.filter(r => r.status === 'warning').length,
        errorCount: errors.length,
        aiMappingResult: request.mappings,
        createdOrderIds,
      } as any);
      await this.auditRepo.save(audit);
    } catch (e: any) {
      this.logger.warn('Could not save import audit:', e.message);
    }

    // 7. Clean up session
    if (request.analyzeId) this.sessions.delete(request.analyzeId);

    return {
      importId,
      createdCount: createdOrderIds.length,
      skippedCount,
      errorCount: errors.length,
      createdOrderIds,
      errors,
    };
  }

  // ─── Build OrderCreateDto from normalized row ─────────────────────────────

  private buildOrderDto(data: NormalizedOrderRow, companyId?: string, user?: any): any {
    const pickupAddress = [
      data.pickupAddress,
      data.pickupPostalCode,
      data.pickupCity,
      data.pickupCountry,
    ].filter(Boolean).join(', ') || null;

    const deliveryAddress = [
      data.deliveryAddress,
      data.deliveryPostalCode,
      data.deliveryCity,
      data.deliveryCountry,
    ].filter(Boolean).join(', ') || null;

    const stops: any[] = [];
    if (data.pickupDate || data.pickupCompany || pickupAddress) {
      stops.push({
        type: 'pickup',
        companyName: data.pickupCompany || null,
        address: pickupAddress,
        postalCode: data.pickupPostalCode || null,
        city: data.pickupCity || null,
        country: data.pickupCountry || null,
        dateFrom: data.pickupDate || null,
        dateTo: data.pickupDate || null,
        timeFrom: data.pickupTimeFrom || null,
        timeUntil: data.pickupTimeTo || null,
        reference: data.loadingReference || null,
      });
    }
    if (data.deliveryDate || data.deliveryCompany || deliveryAddress) {
      stops.push({
        type: 'dropoff',
        companyName: data.deliveryCompany || null,
        address: deliveryAddress,
        postalCode: data.deliveryPostalCode || null,
        city: data.deliveryCity || null,
        country: data.deliveryCountry || null,
        dateFrom: data.deliveryDate || null,
        dateTo: data.deliveryDate || null,
        timeFrom: data.deliveryTimeFrom || null,
        timeUntil: data.deliveryTimeTo || null,
        reference: data.unloadingReference || null,
      });
    }

    const cargoItems: any[] = [];
    if (data.weight || data.pallets || data.volume || data.ldm) {
      cargoItems.push({
        description: data.goodsDescription || 'Cargo',
        unit: data.pallets ? 'pallet' : 'shipment',
        quantity: data.pallets || 1,
        weightKg: data.weight || null,
        volumeCbm: data.volume || null,
        ldm: data.ldm || null,
      });
    }

    return {
      companyId: companyId || null,
      clientName: data.clientName || null,
      customerReference: data.externalReference || null,
      loadingReference: data.loadingReference || null,
      unloadingReference: data.unloadingReference || null,
      contactPerson: data.contactPerson || null,
      contactPhone: data.contactPhone || null,
      price: data.price ?? null,
      currency: data.currency || 'EUR',
      notes: data.notes || null,
      priority: 'normal',
      transportType: 'ftl',
      stops,
      cargoItems,
    };
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  private computeStats(rows: ImportRowResult[]): ImportStats {
    return {
      total: rows.length,
      valid: rows.filter(r => r.status === 'valid').length,
      warnings: rows.filter(r => r.status === 'warning').length,
      needsReview: rows.filter(r => r.status === 'needs_review').length,
      invalid: rows.filter(r => r.status === 'invalid').length,
      duplicates: rows.filter(r => r.status === 'duplicate').length,
    };
  }

  // ─── Session cleanup ──────────────────────────────────────────────────────

  private cleanupSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.createdAt > SESSION_TTL_MS) {
        this.sessions.delete(id);
      }
    }
  }
}
